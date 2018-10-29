import { InjectionToken } from '@angular/core';

// TODO rather than injecting the configuration directly should have a service
// that simplifies the process.

export class NpnConfiguration {
    cacheTTL?: number; // # of minutes for CacheService
    apiRoot: string; // URL of NPN web services
    dataApiRoot: string; // URL of NPN data web services
    dataApiUseStatisticsCache?: boolean; // the value for the useCache parameter for data statistics calls.
    geoServerRoot: string; // URL of the NPN geo server
    [x: string]: any; // not going to dictate what else it might have
}

export const NPN_CONFIGURATION = new InjectionToken<NpnConfiguration>('NpnConfiguration');
