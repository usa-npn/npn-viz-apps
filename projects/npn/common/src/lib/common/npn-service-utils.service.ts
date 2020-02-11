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

    public popApipUrl(suffix:string) {
        return `${this.config.popApiRoot}${suffix}`;
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

    /**
     * Allows a client to populate the cache with an object as would
     * be done by `cachedGet` or `cachedPost` so that subsequent calls
     * to either return this cached object.  This is useful in cases where
     * an error response from a server should be replaced with a default
     * (e.g. 404 cache a default for some resource).
     * 
     * @param url 
     * @param data 
     * @param paramsOrBody 
     */
    public cachedSet(url:string,data:any,paramsOrBody?:any):any {
        paramsOrBody = paramsOrBody || {};
        const cacheKey = {
            u: url,
            params: paramsOrBody
        };
        this.cache.set(cacheKey,data);
        return data;
    }

    public post<T = any>(url:string,body:string):Promise<T> {
        return <Promise<T>>this.http.post(url,body,{headers: {'Content-Type':'application/x-www-form-urlencoded'}}).toPromise();
    }

    public cachedPost<T = any>(url:string,body:string):Promise<T> {
        const cacheKey = {
            u: url,
            params: body
        };
        const data = this.cache.get(cacheKey);
        if(data) {
            return Promise.resolve(data);
        }
        return this.post<T>(url,body)
            .then(response => {
                this.cache.set(cacheKey,response);
                return response;
            });
    }
}
