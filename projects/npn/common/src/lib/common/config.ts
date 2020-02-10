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
    dataApiRoot3: string; // URL of NPN data3 web services (new e.g. https://data-dev.usanpn.org:3004).
    popApiRoot: string;
    geoServerRoot: string; // URL of the NPN geo server
    [x: string]: any; // not going to dictate what else it might have
}

export const NPN_CONFIGURATION = new InjectionToken<NpnConfiguration>('NpnConfiguration');
