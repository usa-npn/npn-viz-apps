import { Injectable, Inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { NpnConfiguration, NPN_CONFIGURATION } from './config';
import { TinybirdTokenService } from './tinybird-token.service';

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

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (!this.isTinybirdRequest(req.url)) {
            return next.handle(req);
        }
        // if no token can be had this rejects, failing the request with a message that
        // names the cause rather than letting it go out bare and come back a bare 403.
        return from(this.tokenService.getToken())
            .pipe(switchMap(token => next.handle(req.clone({
                setHeaders: { Authorization: `Bearer ${token}` }
            }))));
    }
}
