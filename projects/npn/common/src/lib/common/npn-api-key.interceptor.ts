import { Injectable, Inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

import { NpnConfiguration, NPN_CONFIGURATION } from './config';
import { NPN_API_KEY_HEADER, npnApiKey } from './npn-api-key';

/**
 * Attaches the services API key to outbound requests aimed at servicesApiRoot.
 *
 * Opt-in by URL, like TinybirdAuthInterceptor, so the key only goes to the host that
 * issued it and not to www/data/geoserver/Tinybird. Requests that don't match, or any
 * request when no key is configured, pass through untouched.
 *
 * The Tinybird token request does not pass through here (TinybirdTokenService uses
 * HttpBackend directly), so that service attaches the same header itself.
 */
@Injectable()
export class NpnApiKeyInterceptor implements HttpInterceptor {
    constructor(@Inject(NPN_CONFIGURATION) private config: NpnConfiguration) {
    }

    /**
     * Whether a given request is bound for the configured services API root.
     *
     * Matches on the root plus a trailing '/' so that a root of "https://services2.usanpn.org"
     * does not also match "https://services2.usanpn.org.example.com/...".
     */
    private isServicesRequest(url: string): boolean {
        const root = this.config ? this.config.servicesApiRoot : undefined;
        if (!root || !url) {
            return false;
        }
        const normalized = root.replace(/\/+$/, '');
        return url === normalized || url.indexOf(`${normalized}/`) === 0;
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const key = npnApiKey(this.config);
        if (!key || !this.isServicesRequest(req.url)) {
            return next.handle(req);
        }
        return next.handle(req.clone({ setHeaders: { [NPN_API_KEY_HEADER]: key } }));
    }
}
