import { Injectable, Inject } from '@angular/core';
import { NpnConfiguration, NPN_CONFIGURATION } from './config';
import { Md5 } from 'ts-md5/dist/md5';

/**
 * Budget for the in-memory tier.
 *
 * Measured as serialized character count, which is a proxy for -- not the same as --
 * heap usage: parsed objects typically run 2-5x the length of their JSON, so 30M chars
 * is roughly 60-150MB resident. Deliberately chosen to bound the footprint rather than
 * to fit any particular working set; at ~3M chars for a species-year of individual
 * phenometrics it holds on the order of ten datasets before evicting the coldest.
 */
export const MEMORY_CACHE_MAX_CHARS = 30 * 1024 * 1024;

/**
 * Largest entry the sessionStorage tier will accept.
 *
 * Web Storage is capped at roughly 5MB per origin and Chromium accounts it in UTF-16, so
 * the real ceiling is ~2.5M characters. Refusing the big entries outright keeps the many
 * small, frequently read ones (phenophases, boundary types) resident instead of losing
 * everything to one oversized write.
 */
export const SESSION_CACHE_MAX_ENTRY_CHARS = 500 * 1024;

/** Namespaces our sessionStorage keys so pruning can't touch anything else's data. */
const CACHE_KEY_PREFIX = 'npnc:';

/**
 * `structuredClone` is a runtime global that this TypeScript version's lib definitions
 * predate, hence the untyped lookup. Falls back to a JSON round trip, which is what the
 * sessionStorage tier does implicitly anyway.
 */
const structuredCloneFn: (<T>(value: T) => T) | undefined =
    typeof window !== 'undefined' && typeof (window as any).structuredClone === 'function'
        ? (window as any).structuredClone.bind(window)
        : undefined;

interface MemoryCacheEntry {
    expiry: number;
    chars: number;
    data: any;
}

@Injectable()
export class CacheService {
    ttl: number = (60 * 60 * 1000); // default 1 hour

    /**
     * The in-memory tier, for responses too large for Web Storage (individual
     * phenometrics at ~3M characters, the species list at ~930K). Insertion order is the
     * LRU order: reads re-insert to promote, so the first key is always the coldest.
     */
    private memory = new Map<string, MemoryCacheEntry>();
    private memoryChars: number = 0;

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
        return `${CACHE_KEY_PREFIX}${Md5.hashStr(key).toString()}`;
    }

    private get disabled(): boolean {
        return this.ttl <= 0;
    }

    /**
     * Deep copy, so neither tier ever hands a caller a reference into the cache.
     *
     * This is not optional for the memory tier. Consumers mutate what they get back --
     * `SpeciesService.getAllSpeciesConsolidated` both accumulates into
     * `number_observations` and sorts the array in place -- which the sessionStorage
     * tier made harmless only because every read was a fresh `JSON.parse`. Sharing
     * references instead would let those writes land back in the cache and compound on
     * each read.
     */
    private copy<T>(data: T): T {
        if (data === null || typeof (data) !== 'object') {
            return data;
        }
        if (structuredCloneFn) {
            return structuredCloneFn(data);
        }
        return JSON.parse(JSON.stringify(data));
    }

    private charsOf(data: any): number {
        try {
            return JSON.stringify(data).length;
        } catch (ex) {
            return 0; // circular or otherwise unserializable; treat as free rather than throw
        }
    }

    // ---- in-memory tier -------------------------------------------------------------

    getMemory(key: any): any {
        if (this.disabled) {
            return null;
        }
        const ck = this.cacheKey(key);
        const entry = this.memory.get(ck);
        if (!entry) {
            console.log('memory cache miss', ck);
            return null;
        }
        if (Date.now() >= entry.expiry) {
            this.memory.delete(ck);
            this.memoryChars -= entry.chars;
            console.log('memory cache expired', ck);
            return null;
        }
        // LRU promotion: Map iterates in insertion order, so re-inserting makes this the
        // newest and leaves the coldest entry first in line for eviction.
        this.memory.delete(ck);
        this.memory.set(ck, entry);
        console.log('memory cache hit', ck);
        return this.copy(entry.data);
    }

    setMemory(key: any, data: any): void {
        if (this.disabled) {
            return;
        }
        const ck = this.cacheKey(key);
        const existing = this.memory.get(ck);
        if (existing) {
            this.memory.delete(ck);
            this.memoryChars -= existing.chars;
        }
        if (!data) {
            return; // matches the sessionStorage tier: storing nothing removes the entry
        }
        const chars = this.charsOf(data);
        // store a copy so the caller keeps sole ownership of what it already holds; the
        // first consumer of a freshly fetched response mutates it before anyone re-reads
        this.memory.set(ck, { expiry: Date.now() + this.ttl, chars, data: this.copy(data) });
        this.memoryChars += chars;
        this.evictMemory();
    }

    private evictMemory(): void {
        while (this.memoryChars > MEMORY_CACHE_MAX_CHARS && this.memory.size > 0) {
            const coldest = this.memory.keys().next().value;
            const entry = this.memory.get(coldest);
            this.memory.delete(coldest);
            this.memoryChars -= entry.chars;
            console.log(`memory cache evicted ${coldest} (${entry.chars} chars)`);
        }
    }

    // ---- sessionStorage tier --------------------------------------------------------

    get(key: any): any {
        if (this.disabled) {
            return null; // caching disabled
        }
        let ck = this.cacheKey(key),
            entry: any = sessionStorage.getItem(ck);
        if (entry) {
            entry = JSON.parse(entry) as CacheEntry;
            if (Date.now() < entry.expiry) {
                console.log('cache hit', ck);
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
        if (this.disabled) {
            return null; // caching disabled
        }
        let ck = this.cacheKey(key);
        if (!data) {
            console.log('removing from cache', ck);
            sessionStorage.removeItem(ck);
            return;
        }
        const serialized = JSON.stringify({ expiry: (Date.now() + this.ttl), data } as CacheEntry);
        if (serialized.length > SESSION_CACHE_MAX_ENTRY_CHARS) {
            // Too big for Web Storage to hold alongside anything else. Silently declining
            // is the point: the previous behavior was to attempt it, overflow, and wipe
            // the whole cache. Route endpoints that produce responses this size through
            // the memory tier instead (see NpnServiceUtils.memCachedGet/memCachedPost).
            console.log(`not caching ${ck}: ${serialized.length} chars exceeds the ` +
                `${SESSION_CACHE_MAX_ENTRY_CHARS} char sessionStorage entry limit`);
            return;
        }
        try {
            sessionStorage.setItem(ck, serialized);
        } catch (ex) {
            // Previously this called sessionStorage.clear() and retried, so one oversized
            // write destroyed every other cached entry. Drop only what has already
            // expired, then try once more; if it still doesn't fit, skip this entry.
            const reclaimed = this.pruneExpired();
            console.log(`cache write failed for ${ck}, pruned ${reclaimed} expired entries`, ex);
            try {
                sessionStorage.setItem(ck, serialized);
            } catch (ex2) {
                console.log(`giving up caching ${ck} (sessionStorage full)`, ex2);
            }
        }
    }

    /**
     * Removes our own expired entries from sessionStorage.  Only touches keys carrying
     * `CACHE_KEY_PREFIX`, so anything else sharing this origin's storage is left alone.
     *
     * @return the number of entries removed
     */
    private pruneExpired(): number {
        const now = Date.now();
        const doomed: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const ck = sessionStorage.key(i);
            if (!ck || ck.indexOf(CACHE_KEY_PREFIX) !== 0) {
                continue;
            }
            try {
                const entry = JSON.parse(sessionStorage.getItem(ck)) as CacheEntry;
                if (!entry || now >= entry.expiry) {
                    doomed.push(ck);
                }
            } catch (ex) {
                doomed.push(ck); // unparseable, no reason to keep it
            }
        }
        doomed.forEach(ck => sessionStorage.removeItem(ck));
        return doomed.length;
    }
}

class CacheEntry {
    expiry: number;
    data: any;
}
