import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CacheService } from './cache.service';

import { NpnConfiguration, NPN_CONFIGURATION } from './config';

/**
 * @todo rename dataApi[2], etc. (along with NpnConfiguration) to be more meaningful.
 */
@Injectable()
export class NpnServiceUtils {
    constructor(public http: HttpClient,
        public cache: CacheService,
        @Inject(NPN_CONFIGURATION) public config: NpnConfiguration) {
    }

    public apiUrl(suffix: string) {
        return `${this.config.apiRoot}${suffix}`;
    }

    public dataApiUrl(suffix: string) {
        return `${this.config.dataApiRoot}${suffix}`;
    }

    public dataApiUrl2(suffix: string) {
        return `${this.config.dataApiRoot2}${suffix}`;
    }

    public geoServerUrl(suffix: string) {
        return `${this.config.geoServerRoot}${suffix}`;
    }

    get dataApiUseStatisticsCache(): boolean {
        return typeof (this.config.dataApiUseStatisticsCache) === 'boolean' ?
            this.config.dataApiUseStatisticsCache : false;
    }

    public get(url: string, params?: any, asText?: boolean): Promise<any> {
        params = params || {};
        return asText
            ? this.http.get(url, { params: params, responseType: 'text' }).toPromise()
            : this.http.get<any>(url, { params: params }).toPromise()
    }

    public cachedGet(url: string, params?: any, asText?: boolean): Promise<any> {
        params = params || {};
        const cacheKey = {
            u: url,
            params: params
        };
        const data = this.cache.get(cacheKey);
        if (data) {
            return Promise.resolve(data);
        }
        return this.get(url, params, asText)
            .then(data => {
                this.cache.set(cacheKey, data);
                return data;
            });
    }

    public post(url:string,body:string):Promise<any> {
        return this.http.post(url,body,{headers: {'Content-Type':'application/x-www-form-urlencoded'}}).toPromise();
    }

    public cachedPost(url:string,body:string):Promise<any> {
        const cacheKey = {
            u: url,
            params: body
        };
        const data = this.cache.get(cacheKey);
        if(data) {
            return Promise.resolve(data);
        }
        return this.post(url,body)
            .then(response => {
                this.cache.set(cacheKey,response);
                return response;
            });
    }
}
