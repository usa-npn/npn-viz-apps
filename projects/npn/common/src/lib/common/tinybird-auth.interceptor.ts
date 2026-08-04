import { Injectable, Inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { NpnConfiguration, NPN_CONFIGURATION } from './config';
import { TinybirdTokenService } from './tinybird-token.service';

/**
 * Default minimum spacing between outbound Tinybird requests.
 *
 * Tinybird rate limits the workspace token and answers bursts with
 * `429 Too many requests: retry after 1 seconds`. A single visualization fans out into
 * many pipe requests at once (species, phenophases per plot, a station lookup per
 * boundary polygon), which was enough to trip it and break the UI. Override per
 * environment with `tinybirdMinRequestSpacingMs`.
 */
export const TINYBIRD_DEFAULT_REQUEST_SPACING_MS = 500;

/**
 * Attaches a Tinybird JWT to outbound requests aimed at the Tinybird API.
 *
 * Opt-in by URL rather than applied to every request.  The token is scoped to a
 * single Tinybird workspace and is of no use to www/data/geoserver/pop, so attaching
 * it globally would hand a credential to several unrelated hosts and would collide
 * with the Authorization header the NPN services API expects for its own (unrelated)
 * bearer auth.  Requests that don't match pass through untouched.
 *
 * Note this covers only traffic that goes through HttpClient.  Tile URLs handed to
 * google.maps.ImageMapType are loaded by the browser as images and cannot carry an
 * Authorization header; a Tinybird backed tile layer would need a different approach.
 */
@Injectable()
export class TinybirdAuthInterceptor implements HttpInterceptor {
    constructor(@Inject(NPN_CONFIGURATION) private config: NpnConfiguration,
        private tokenService: TinybirdTokenService) {
    }

    /**
     * Whether a given request is bound for the configured Tinybird API root.
     *
     * Matches on the root plus a trailing '/' so that a root of "https://foo.tinybird.co"
     * does not also match "https://foo.tinybird.co.example.com/...".
     */
    private isTinybirdRequest(url: string): boolean {
        const root = this.config ? this.config.tinybirdApiRoot : undefined;
        if (!root || !url) {
            return false; // unconfigured: this interceptor does nothing
        }
        const normalized = root.replace(/\/+$/, '');
        return url === normalized || url.indexOf(`${normalized}/`) === 0;
    }

    /** epoch millis at which the next request is allowed to go out */
    private nextSlot: number = 0;

    private get spacingMs(): number {
        const configured = this.config ? this.config.tinybirdMinRequestSpacingMs : undefined;
        return typeof (configured) === 'number' ? configured : TINYBIRD_DEFAULT_REQUEST_SPACING_MS;
    }

    /**
     * Claims the next send slot and resolves when it comes up.
     *
     * The claim itself is synchronous, so slots are handed out in arrival order and
     * concurrent callers cannot collide (JS runs this to completion). Only the *start* of
     * each request is spaced -- a slow request does not hold up the ones behind it, so
     * this throttles the burst without serializing the whole pipeline.
     */
    private takeSlot(): Promise<void> {
        const spacing = this.spacingMs;
        if (spacing <= 0) {
            return Promise.resolve();
        }
        const now = Date.now();
        const sendAt = Math.max(now, this.nextSlot);
        this.nextSlot = sendAt + spacing;
        return sendAt === now
            ? Promise.resolve()
            : new Promise<void>(resolve => setTimeout(() => resolve(), sendAt - now));
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (!this.isTinybirdRequest(req.url)) {
            return next.handle(req);
        }
        // Throttle first, then get the token: the token is shared and cached, so acquiring
        // it costs nothing per request, whereas the slot is what keeps the burst off the
        // wire. Requests served from CacheService never reach an interceptor, so cache hits
        // are not delayed by this.
        //
        // if no token can be had this rejects, failing the request with a message that
        // names the cause rather than letting it go out bare and come back a bare 403.
        return from(this.takeSlot().then(() => this.tokenService.getToken()))
            .pipe(switchMap(token => next.handle(req.clone({
                setHeaders: { Authorization: `Bearer ${token}` }
            }))));
    }
}
