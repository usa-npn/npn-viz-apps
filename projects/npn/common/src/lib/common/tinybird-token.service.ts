import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpBackend } from '@angular/common/http';

import { NpnConfiguration, NPN_CONFIGURATION } from './config';

/**
 * The response returned by the token endpoint (config.tinybirdTokenUrl).
 * e.g. {"token":"eyJhbGciOiJIUzI1NiJ9...","expires_at":"2026-07-30T10:40:14.000Z"}
 */
export interface TinybirdTokenResponse {
    token: string;
    expires_at: string;
}

/**
 * How long before a token's stated expiration it is treated as already expired.
 *
 * The server issues tokens with a one hour lifetime so this leaves ~45 minutes of
 * usable life.  The window absorbs request latency, a long running query started
 * near expiration, and modest client clock drift -- the last of which matters
 * because nothing retries on a 401/403, so a fast client clock would otherwise
 * send an expired token and simply fail.
 */
export const TINYBIRD_TOKEN_EXPIRY_SKEW = (15 * 60 * 1000); // 15 minutes

/**
 * Supplies short lived JWTs for requests to the Tinybird API.
 *
 * The token is held in memory only.  The endpoint responds with `cache-control: no-store`
 * and a token costs a single fast request to replace, so there is nothing to gain by
 * persisting it to session/local storage and a credential on disk to lose.  For the
 * same reason this deliberately does *not* go through NpnServiceUtils/CacheService.
 *
 * Validity is re-checked on every request rather than refreshed on a timer.  A timer
 * does not fire while a laptop is asleep, so it would wake up holding a dead token;
 * checking `expires_at` before use is correct regardless of how long a tab sat idle.
 *
 * Injects HttpBackend rather than HttpClient on purpose.  HttpClient depends on the
 * interceptor chain, and TinybirdAuthInterceptor depends on this service, so injecting
 * HttpClient here would form a dependency cycle and fail at runtime with
 * "Cannot instantiate cyclic dependency! HttpClient".  Using the backend directly also
 * means the token request can never itself be intercepted -- including by any error or
 * retry interceptor added later, which would otherwise depend on this service to
 * recover a request made by this service.
 */
@Injectable()
export class TinybirdTokenService {
    private http: HttpClient;
    private token: string;
    private expiresAt: number; // epoch millis, from the response's expires_at
    private inFlight: Promise<string>; // shared so concurrent callers issue one request
    private _lastError: any;

    constructor(@Inject(NPN_CONFIGURATION) private config: NpnConfiguration, backend: HttpBackend) {
        // a private HttpClient built on the raw transport, bypassing all interceptors
        this.http = new HttpClient(backend);
    }

    /**
     * Whether a token endpoint has been configured.  When false this service does
     * nothing; callers other than the interceptor should check this before asking
     * for a token.
     */
    get configured(): boolean {
        return !!(this.config && this.config.tinybirdTokenUrl);
    }

    /**
     * Whether a currently usable (non-expired) token is in hand.  Exposed so a
     * consumer can surface token trouble in the UI; nothing does so today.
     */
    get hasValidToken(): boolean {
        return !!this.token && !this.isExpired();
    }

    /**
     * The error from the most recent failed token fetch, if any.  Cleared on success.
     */
    get lastError(): any {
        return this._lastError;
    }

    private isExpired(): boolean {
        return !this.expiresAt || (Date.now() + TINYBIRD_TOKEN_EXPIRY_SKEW) >= this.expiresAt;
    }

    /**
     * Resolves with a valid token, fetching or refreshing one if necessary.
     *
     * Concurrent callers during a fetch share a single request rather than each
     * issuing their own; the token endpoint sits behind a rate limit and a single
     * visualization can fan out into many parallel data requests.
     *
     * Rejects (rather than resolving with null) when no token can be obtained, so
     * that callers fail with a message naming the cause instead of issuing a request
     * that is known to 403.
     */
    getToken(): Promise<string> {
        if (!this.configured) {
            return Promise.reject(new Error('No Tinybird token endpoint configured (tinybirdTokenUrl)'));
        }
        if (this.token && !this.isExpired()) {
            return Promise.resolve(this.token);
        }
        if (!this.inFlight) {
            this.inFlight = this.fetchToken();
        }
        return this.inFlight;
    }

    /**
     * Fetch a token in the background, ignoring failure.  Called at application
     * startup so the first request that needs a token does not also pay for
     * acquiring one.  Purely an optimization -- correctness comes from getToken().
     */
    prefetch(): void {
        if (this.configured) {
            this.getToken().catch(() => { /* startup must not fail over a token */ });
        }
    }

    private fetchToken(): Promise<string> {
        return this.http.get<TinybirdTokenResponse>(this.config.tinybirdTokenUrl)
            .toPromise()
            .then(response => {
                const expiresAt = response && response.expires_at ? Date.parse(response.expires_at) : NaN;
                if (!response || !response.token) {
                    throw new Error('Tinybird token response contained no token');
                }
                if (isNaN(expiresAt)) {
                    // without a usable expiration there is no way to know when to refresh;
                    // treating it as valid forever, or as always expired, are both worse
                    // than refusing it, so fail with something diagnosable.
                    throw new Error(`Tinybird token response contained no usable expires_at ("${response.expires_at}")`);
                }
                this.token = response.token;
                this.expiresAt = expiresAt;
                this._lastError = undefined;
                this.inFlight = undefined;
                return this.token;
            })
            .catch(error => {
                // deliberately not retaining the rejected promise; caching a failure
                // would poison every later request for the life of the session.
                this.token = undefined;
                this.expiresAt = undefined;
                this._lastError = error;
                this.inFlight = undefined;
                console.error('Unable to obtain a Tinybird access token', error);
                throw error;
            });
    }
}
