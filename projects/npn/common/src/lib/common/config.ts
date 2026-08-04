import { InjectionToken } from '@angular/core';

/**
 * @todo rename dataApiRoot2 and the corresponding methods in NpnServiceUtils
 */
export class NpnConfiguration {
    cacheTTL?: number; // # of minutes for CacheService
    apiRoot: string; // URL of NPN web services
    dataApiRoot: string; // URL of NPN data web services (e.g. //data-dev.usanpn.org:3006)
    dataApiUseStatisticsCache?: boolean; // the value for the useCache parameter for data statistics calls.
    dataApiRoot2: string; // URL of NPN data2 web services (new, e.g. https://data-dev.usanpn.org/webservices).
    popApiRoot: string;
    geoServerRoot: string; // URL of the NPN geo server
    // URL root of the Tinybird API (e.g. https://api.us-west-2.aws.tinybird.co).
    // Requests to URLs beneath this root have a JWT attached by TinybirdAuthInterceptor.
    // Optional: when absent no request is ever matched and the interceptor is inert.
    tinybirdApiRoot?: string;
    // URL that mints short lived Tinybird JWTs (e.g. https://services2-dev.usanpn.org/v1/data/token).
    // Optional: when absent TinybirdTokenService will not attempt to fetch a token.
    tinybirdTokenUrl?: string;
    // Minimum milliseconds between outbound Tinybird requests, enforced by
    // TinybirdAuthInterceptor. Tinybird rate limits the workspace token and answers bursts
    // with 429, which nothing recovers from generically. Optional: defaults to
    // TINYBIRD_DEFAULT_REQUEST_SPACING_MS. Set 0 to disable throttling entirely.
    tinybirdMinRequestSpacingMs?: number;
    // URL root of the Nature's Notebook v1 services API (e.g. https://services2-dev.usanpn.org),
    // home of endpoints like /v1/data/individual_phenometrics. Optional: when absent
    // ObservationService.getIndividualPhenometrics rejects rather than requesting a malformed URL.
    servicesApiRoot?: string;
    [x: string]: any; // not going to dictate what else it might have
}

export const NPN_CONFIGURATION = new InjectionToken<NpnConfiguration>('NpnConfiguration');
