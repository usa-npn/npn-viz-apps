import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import 'rxjs/add/operator/toPromise';
import { CacheService } from './cache-service';

import { NpnConfiguration, NPN_CONFIGURATION } from './config';

/*
TODO
What this service is doing is very boiler plate and should be consolidated in a shared injectable service.
I.e.
Many service inject Http/CacheService/NpnConfiguration and then contain logic very very similar to
what is done in getNetworks.  These three injectables should be wrapped up in a common service class
that avoids everyone needing to inject those three things (I.e. exposes Http/CacheService/NpnConfiguration as public members)
and contains utility functions ala ClippedWmsMapSelection.cachedGet in which case getStations becomes just a few lines.
 */

@Injectable()
export class NetworkService {

    constructor(private http: HttpClient,
        private cache: CacheService,
        @Inject(NPN_CONFIGURATION) private config: NpnConfiguration) {
    }

    getStations(networkId): Promise<any[]> {
        return new Promise((resolve, reject) => {
            let url = `${this.config.apiRoot}/npn_portal/stations/getStationsForNetwork.json`,
                params = {
                    network_id: networkId
                },
                cacheKey = {
                    u: url,
                    params: params
                },
                data: any[] = this.cache.get(cacheKey) as any[];
            if (data) {
                resolve(data);
            } else {
                this.http.get<any[]>(url, { params: params })
                    .toPromise()
                    .then(data => {
                        this.cache.set(cacheKey, data);
                        resolve(data);
                    })
                    .catch(reject);
            }
        });
    }
}
