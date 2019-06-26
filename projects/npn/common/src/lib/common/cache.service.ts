import { Injectable, Inject } from '@angular/core';
import { NpnConfiguration, NPN_CONFIGURATION } from './config';
import { Md5 } from 'ts-md5/dist/md5';

@Injectable()
export class CacheService {
    ttl: number = (60 * 60 * 1000); // default 1 hour

    // has to inject NpnConfiguration since can't use NpnServiceUtils
    // w/out introducing a circular dependency.
    constructor(@Inject(NPN_CONFIGURATION) public config: NpnConfiguration) {
        if ((typeof (config.cacheTTL)) === 'number') {
            this.ttl = config.cacheTTL * 60 * 1000; // value in minutes
        }
        console.log(`CacheService Time To Live ${this.ttl / 60000} minutes`);
        if (this.ttl === 0) {
            console.log('Caching disabled clearing local session storage');
            sessionStorage.clear();
        }
    }

    cacheKey(key: any): string {
        if (typeof (key) !== 'string') {
            key = JSON.stringify(key);
        }
        // not sure about the .toString() on the end since Md=5.hashStr returns string Int32Array
        return Md5.hashStr(key).toString();
    }

    get(key: any): any {
        if (this.ttl <= 0) {
            return null; // caching disabled
        }
        let ck = this.cacheKey(key),
            entry: any = sessionStorage.getItem(ck);
        if (entry) {
            entry = JSON.parse(entry) as CacheEntry;
            if (Date.now() < entry.expiry) {
                console.log('cache hit', ck, key);
                return entry.data;
            }
            console.log('cache expired', ck);
            window.sessionStorage.removeItem(ck);
        } else {
            console.log('cache miss', ck);
        }
        return null;
    }

    set(key: any, data: any): void {
        if (this.ttl <= 0) {
            return null; // caching disabled
        }
        let ck = this.cacheKey(key);
        if (data) {
            let entry: CacheEntry = {
                expiry: (Date.now() + this.ttl),
                data: data
            };
            console.log('caching', ck, data);
            try {
                sessionStorage.setItem(ck, JSON.stringify(entry));
            } catch (ex) {
                console.log('error storing item in cache', ex);
                // the assumption here is that this has happened because
                // we've stored too much, do the simplest thing
                // wipe it clean and try again.
                console.log('clearing');
                sessionStorage.clear();
                try {
                    sessionStorage.setItem(ck, JSON.stringify(entry));
                } catch (ex) {
                    console.log('error on second store attempt (giving up).', ex);
                }
            }
        } else {
            console.log('removing from cache', ck);
            sessionStorage.removeItem(ck);
        }
    }
}

class CacheEntry {
    expiry: number;
    data: any;
}
