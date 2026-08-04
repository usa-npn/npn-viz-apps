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

    public tinybirdUrl(suffix: string) {
        return `${this.config.tinybirdApiRoot}${suffix}`;
    }

    public popApipUrl(suffix:string) {
        return `${this.config.popApiRoot}${suffix}`;
    }

    public servicesApiUrl(suffix: string) {
        return `${this.config.servicesApiRoot}${suffix}`;
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
        return this.cachedGetIn(false, url, params, asText);
    }

    /**
     * `cachedGet` against the in-memory tier rather than sessionStorage.
     *
     * For endpoints whose responses are too large for Web Storage's ~5MB origin cap --
     * anything approaching the `SESSION_CACHE_MAX_ENTRY_CHARS` limit, which the session
     * tier now declines rather than overflowing on. Today that means the species list
     * (~930K chars); see `memCachedPost` for individual phenometrics.
     */
    public memCachedGet(url: string, params?: any, asText?: boolean): Promise<any> {
        return this.cachedGetIn(true, url, params, asText);
    }

    private cachedGetIn(memory: boolean, url: string, params?: any, asText?: boolean): Promise<any> {
        params = params || {};
        const cacheKey = {
            u: url,
            params: params
        };
        const data = memory ? this.cache.getMemory(cacheKey) : this.cache.get(cacheKey);
        if (data) {
            return Promise.resolve(data);
        }
        return this.get(url, params, asText)
            .then(data => {
                if (memory) {
                    this.cache.setMemory(cacheKey, data);
                } else {
                    this.cache.set(cacheKey, data);
                }
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

    public post<T = any>(url:string,body:any,headers:{[k:string]:string} = {'Content-Type':'application/x-www-form-urlencoded'}):Promise<T> {
        return <Promise<T>>this.http.post(url,body,{headers}).toPromise();
    }

    public cachedPost<T = any>(url:string,body:any,headers?:{[k:string]:string}):Promise<T> {
        return this.cachedPostIn<T>(false,url,body,headers);
    }

    /**
     * `cachedPost` against the in-memory tier rather than sessionStorage.
     *
     * Individual phenometrics measures ~3M characters for a single species-year, which
     * exceeds the whole Web Storage origin quota on its own -- it could never be cached
     * there, and each attempt used to wipe everything else out.
     */
    public memCachedPost<T = any>(url:string,body:any,headers?:{[k:string]:string}):Promise<T> {
        return this.cachedPostIn<T>(true,url,body,headers);
    }

    private cachedPostIn<T = any>(memory:boolean,url:string,body:any,headers?:{[k:string]:string}):Promise<T> {
        const cacheKey = {
            u: url,
            params: body
        };
        const data = memory ? this.cache.getMemory(cacheKey) : this.cache.get(cacheKey);
        if(data) {
            return Promise.resolve(data);
        }
        return this.post<T>(url,body,headers)
            .then(response => {
                if(memory) {
                    this.cache.setMemory(cacheKey,response);
                } else {
                    this.cache.set(cacheKey,response);
                }
                return response;
            });
    }
}
