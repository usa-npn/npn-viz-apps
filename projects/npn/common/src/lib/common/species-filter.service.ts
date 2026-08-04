import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';

import { NpnServiceUtils } from './npn-service-utils.service';
import { TaxonomicSpecies } from './species';

/**
 * The envelope every Tinybird pipe responds with -- `data` is the actual
 * result set, the rest is query metadata nothing here consumes (yet).
 */
export interface TinybirdPipeResponse<T> {
    data: T[];
    meta: { name: string; type: string }[];
    rows: number;
    statistics: { elapsed: number; rows_read: number; bytes_read: number };
}

function sourceKeys(source: HttpParams | any): string[] {
    return source instanceof HttpParams ? source.keys() : Object.keys(source || {});
}

function sourceValue(source: HttpParams | any, key: string): any {
    return source instanceof HttpParams ? source.get(key) : source[key];
}

/**
 * Reads every value for `legacyName` out of `source`, where the legacy caller may have
 * supplied it as a single key (`network_id`) or as an indexed array
 * (`network_id[0]`, `network_id[1]`, ...) -- both conventions are in active use across
 * callers of SpeciesService today.
 */
function collectLegacyValues(source: HttpParams | any, legacyName: string): string[] {
    const indexed = new RegExp(`^${legacyName}\\[\\d+\\]$`);
    return sourceKeys(source)
        .filter(key => key === legacyName || indexed.test(key))
        .map(key => sourceValue(source, key))
        .filter(value => value !== null && value !== undefined && value !== '')
        .map(value => `${value}`);
}

/**
 * Translates the request shape SpeciesService's callers already use (bracket-indexed
 * arrays, singular `network_id`/`person_id`, left over from the legacy
 * `getSpeciesFilter.json` REST convention) into the `species_filter` Tinybird pipe's
 * params, verified directly against the pipe on 2026-07-30:
 *
 * - `network_ids`, `person_ids`, `site_ids` each take a comma-separated list.
 * - `start_date`/`end_date` are unchanged.
 * - `taxon` is deliberately not populated here -- confirmed unwired server-side as of
 *   2026-07-30 (every value tried, including exact `kingdom` values from the pipe's own
 *   response, returned the full unfiltered result set). Add it once the pipe honors it.
 */
export function toSpeciesFilterParams(source: HttpParams | any = {}): { [key: string]: string } {
    const params: { [key: string]: string } = {};

    const startDate = sourceValue(source, 'start_date');
    const endDate = sourceValue(source, 'end_date');
    if (startDate) { params.start_date = `${startDate}`; }
    if (endDate) { params.end_date = `${endDate}`; }

    const networkIds = collectLegacyValues(source, 'network_id');
    if (networkIds.length) { params.network_ids = networkIds.join(','); }

    const personIds = collectLegacyValues(source, 'person_id');
    if (personIds.length) { params.person_ids = personIds.join(','); }

    const siteIds = collectLegacyValues(source, 'station_ids');
    if (siteIds.length) { params.site_ids = siteIds.join(','); }

    return params;
}

/**
 * Data-layer for the `species_filter` Tinybird pipe -- owns the endpoint URL, the
 * request translation, and unwrapping the response envelope, so `SpeciesService`
 * (and any future caller) deals only in `TaxonomicSpecies[]`.
 *
 * First of the endpoints named in REFACTORING-NOTES.md to move fetch+parse out of a
 * model/service and into its own layer; intentionally not a template applied to every
 * endpoint in this pass.
 */
@Injectable()
export class SpeciesFilterService {
    constructor(private serviceUtils: NpnServiceUtils) {}

    getSpecies(source: HttpParams | any = {}): Promise<TaxonomicSpecies[]> {
        const url = this.serviceUtils.tinybirdUrl('/v0/pipes/species_filter.json');
        const params = toSpeciesFilterParams(source);
        // memory tier: the unfiltered list measures ~930K characters, which costs ~1.9MB
        // of a ~5MB sessionStorage quota (Chromium accounts it in UTF-16) and is read on
        // every criteria change. Note the memory tier copies on read -- required here,
        // because `SpeciesService.getAllSpeciesConsolidated` mutates what it gets back.
        return this.serviceUtils.memCachedGet(url, params)
            .then((response: TinybirdPipeResponse<TaxonomicSpecies>) => response.data);
    }
}
