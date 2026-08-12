import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';

import { NpnServiceUtils } from './npn-service-utils.service';

/**
 * Reads every value set for `legacyName` on `params`, where the caller may have supplied
 * it as a single key (`network_id`) or as an indexed array (`network_id[0]`,
 * `network_id[1]`, ...) -- both conventions are in active use across the selection
 * hierarchy that builds these params (see `species-filter.service.ts` for the same
 * pattern applied to a different endpoint).
 *
 * The endpoint's schema wants these as numbers, not strings -- e.g. `species_ids` 400s
 * with `{"expected":"number","code":"invalid_type","path":["species_ids",0], ...}` when
 * given the string ids that `HttpParams` (and the legacy REST convention) always carries.
 */
export function collectLegacyIds(params: HttpParams, legacyName: string): number[] {
    const indexed = new RegExp(`^${legacyName}\\[\\d+\\]$`);
    return params.keys()
        .filter(key => key === legacyName || indexed.test(key))
        .map(key => params.get(key))
        .filter(value => value !== null && value !== undefined && value !== '')
        .map(value => Number(value))
        .filter(value => !isNaN(value));
}

/**
 * Translates the `HttpParams` built by `SiteOrSummaryVisSelection.toURLSearchParams()`
 * into the body required by `/v1/data/individual_phenometrics`.
 *
 * Base shape verified against the live `/openapi.json` and real POSTs on 2026-07-29
 * (see `docs/plans/summarized-data.md`): 12 required fields, so anything not named here
 * -- `phenophase_id[n]`, `num_days_quality_filter_individual`, `request_src` -- is
 * deliberately dropped rather than forwarded. Empty arrays are acceptable for fields this
 * client doesn't populate yet.
 *
 * The selection's `climate_data` param is not forwarded under that name; `include_climate`
 * below is the equivalent this endpoint understands, and it is always set.
 *
 * `taxonomy_aggregate`/`pheno_class_aggregate` are set by `fetchDataForPlot`
 * (`site-or-summary-vis-selection.ts`) whenever the plot is built at a taxonomic rank
 * above species (class/order/family/genus) or at the phenophase-class rank -- both of
 * which the app's plot-selection UI uses exclusively for phenophase (see
 * `higher-species-phenophase-input.component.ts`). Their presence here signals the
 * corresponding `include_*_detail` flag so the response rows carry the extra id field
 * (`Genus_ID`/`Family_ID`/.../`Pheno_Class_ID`) that `filterUnwantedDataFunctor` matches
 * the plot against -- without it those rows come back at the raw species/phenophase
 * level and nothing in the response matches the aggregated id the plot expects.
 */
export function toIndividualPhenometricsBody(params: HttpParams): any {
    const body: any = {
        startDate: params.get('start_date') || '',
        endDate: params.get('end_date') || '',
        state: [],
        species_ids: collectLegacyIds(params, 'species_id'),
        species_names: [],
        network_ids: collectLegacyIds(params, 'network_id'),
        dataset_ids: [],
        phenophaseCategories: [],
        stations: collectLegacyIds(params, 'station_id'),
        individual_ids: [],
        partnerGroups: [],
        integrated_datasets: [],
        // Requested on every call rather than mirroring the selection's `climate_data`
        // param: plotting phenology against climate is a first class use of this data and
        // the axis definitions expect the columns to be present. A string "1" -- the
        // upstream schema types this as `include_climate?: string`, not a number or bool.
        include_climate: '1'
    };
    if (params.has('taxonomy_aggregate')) {
        body.include_taxonomic_detail = '1';
    }
    if (params.has('pheno_class_aggregate')) {
        body.include_phenophase_detail = '1';
    }
    return body;
}

/**
 * The taxonomic/phenophase rank id keys a plot or curve may set on its `HttpParams`, and
 * the `taxon` value each implies. `phenophase_id`/`pheno_class_id` drive `phenophase_grain`
 * instead (see `buildPhenometricsBody` below) so they have no entry here.
 *
 * Grain is orthogonal to which id array is populated -- `magnitude_metrics.pipe:30` is
 * explicit that grain is never inferred server-side from the filter supplied, so both the
 * id array *and* `taxon`/`phenophase_grain` must be sent. Deriving them from the key name
 * is safe here only because `getSpeciesPlotKeys` picks the same key from the plot/curve's
 * `speciesRank`/`phenophaseRank`, so the two cannot disagree.
 */
export const RANK_KEYS = ['species_id', 'genus_id', 'family_id', 'order_id', 'class_id',
    'phenophase_id', 'pheno_class_id'];
export const TAXON_BY_KEY: { [key: string]: string } = {
    species_id: 'species', genus_id: 'genus', family_id: 'family',
    order_id: 'order', class_id: 'class'
};

/**
 * Shared body builder for `/v1/data/magnitude_phenometrics` and `/v1/data/site_phenometrics`
 * -- both endpoints take the same core filter/grain shape, differing only in the extras each
 * adds (see `getMagnitudeData`/`getSiteLevelData` below).
 *
 * `network_id[n]` is deliberately not read here: nothing in the selection hierarchy sets it
 * -- networks and boundaries are resolved to `station_id[n]` client-side
 * (`vis-selection.ts` `getStationIds`/`getStationIdPromises`) before params ever reach this
 * builder. `group_id` has no equivalent field on either endpoint and is dropped too.
 */
function buildPhenometricsBody(params: HttpParams): any {
    const body: any = {
        startDate: params.get('start_date') || '',
        endDate: params.get('end_date') || '',
        stations: collectLegacyIds(params, 'station_id'),
        taxon: 'species',
        phenophase_grain: 'phenophase'
    };
    RANK_KEYS.forEach(key => {
        const ids = collectLegacyIds(params, key);
        if (ids.length) {
            body[`${key}s`] = ids;
            if (TAXON_BY_KEY[key]) {
                body.taxon = TAXON_BY_KEY[key];
            }
            if (key === 'pheno_class_id') {
                body.phenophase_grain = 'pheno_class';
            }
        }
    });
    if (params.has('person_id')) {
        body.person_ids = [Number(params.get('person_id'))];
    }
    return body;
}

/**
 * The endpoint responds with a bare array of rows in legacy PascalCase
 * (`First_Yes_DOY`, `NumDays_Since_Prior_No`, `Individual_ID`, ...). Lowercasing each key
 * produces exactly the snake_case names the downstream filters and `AXIS` definitions
 * already read (`first_yes_doy`, `numdays_since_prior_no`, `individual_id`, ...) so
 * nothing else in the fetch/filter pipeline needs to change.
 */
function lowercaseKeys(row: any): any {
    return Object.keys(row).reduce((o, key) => {
        o[key.toLowerCase()] = row[key];
        return o;
    }, {} as any);
}

/**
 * `site_phenometrics` has no year in its grain key and decomposes per phenological year
 * server-side, so N chunks of a range return the same rows as one call over the whole
 * range -- chunking here is purely to stay under the endpoint's wall-clock budget
 * (`tinybirdSyncExport.ts`'s per-window time guard aborts and 413s past roughly 4-5 years,
 * well before the 25MB byte budget is ever approached; see
 * `docs/plans/magnitude-site-level-data.md`).
 *
 * Chunks are aligned to a fixed 4-year grid (`floor(year/4)*4`) rather than simply walked
 * from the start date, so that interior chunks keep the same cache key when a user nudges
 * only one end of the range. Every selection that reaches this endpoint builds calendar
 * (Jan 1 - Dec 31) ranges, so grid boundaries coincide with the server's own window
 * boundaries; a water-year range would need this revisited.
 */
const SITE_CHUNK_YEARS = 4;

function yearOf(dateStr: string): number {
    return parseInt(dateStr.slice(0, 4), 10);
}

function siteLevelChunks(startDate: string, endDate: string): { startDate: string; endDate: string }[] {
    const startYear = yearOf(startDate);
    const endYear = yearOf(endDate);
    const gridStart = Math.floor(startYear / SITE_CHUNK_YEARS) * SITE_CHUNK_YEARS;
    const chunks: { startDate: string; endDate: string }[] = [];
    for (let s = gridStart; s <= endYear; s += SITE_CHUNK_YEARS) {
        const chunkStartYear = Math.max(s, startYear);
        const chunkEndYear = Math.min(s + SITE_CHUNK_YEARS - 1, endYear);
        if (chunkStartYear > chunkEndYear) {
            continue;
        }
        chunks.push({
            // first/last chunks clip to the actual requested date (not just the year) so
            // e.g. a mid-year start isn't widened back out to the full grid cell -- doing
            // so would push that chunk back up to a full 4 years and re-risk the time budget.
            startDate: chunkStartYear === startYear ? startDate : `${chunkStartYear}-01-01`,
            endDate: chunkEndYear === endYear ? endDate : `${chunkEndYear}-12-31`
        });
    }
    return chunks;
}

/**
 * Halves a chunk by year, in response to a 413. Splitting continues only while more than
 * one calendar year remains in the chunk -- a single year that still 413s has nowhere
 * further to split and is a terminal failure (see `postSiteChunk`).
 */
function splitChunk(chunk: { startDate: string; endDate: string }): { startDate: string; endDate: string }[] {
    const startYear = yearOf(chunk.startDate);
    const endYear = yearOf(chunk.endDate);
    const midYear = startYear + Math.floor((endYear - startYear) / 2);
    return [
        { startDate: chunk.startDate, endDate: `${midYear}-12-31` },
        { startDate: `${midYear + 1}-01-01`, endDate: chunk.endDate }
    ];
}

/**
 * Posts a single site-level chunk, splitting and retrying on 413 (see `splitChunk`). Any
 * other error rejects immediately rather than being retried -- partial data on a scatter
 * plot or map is indistinguishable from years genuinely having no observations, so a
 * request that fails outright must not resolve with only some of its chunks.
 */
function postSiteChunk(
    serviceUtils: NpnServiceUtils, url: string, bodyBase: any,
    chunk: { startDate: string; endDate: string }
): Promise<any[]> {
    const body = { ...bodyBase, startDate: chunk.startDate, endDate: chunk.endDate };
    return serviceUtils.memCachedPost<any[]>(url, body, { 'Content-Type': 'application/json' })
        .then(rows => rows || [])
        .catch(err => {
            if (err && err.status === 413) {
                const startYear = yearOf(chunk.startDate);
                const endYear = yearOf(chunk.endDate);
                if (startYear === endYear) {
                    throw new Error(
                        `Site level query returned too much data (413) for ${startYear} -- ` +
                        'narrow the species, station, or phenophase selection and try again.');
                }
                const [a, b] = splitChunk(chunk);
                return postSiteChunk(serviceUtils, url, bodyBase, a)
                    .then(aRows => postSiteChunk(serviceUtils, url, bodyBase, b)
                        .then(bRows => aRows.concat(bRows)));
            }
            throw err;
        });
}

/**
 * Data-layer for site-level and individual phenology observations -- replaces the legacy
 * `/npn_portal/observations/getSiteLevelData.json` and `getSummarizedData.json` REST calls
 * made from `SiteOrSummaryVisSelection`, per REFACTORING-NOTES.md §1 (`ObservationService`
 * was listed there as "missing").
 */
@Injectable()
export class ObservationService {
    constructor(private serviceUtils: NpnServiceUtils) {}

    /**
     * Site-level phenometrics -- replaces the legacy
     * `/npn_portal/observations/getSiteLevelData.json` POST made when
     * `individualPhenometrics` is disabled on `SiteOrSummaryVisSelection`, and backs the
     * map visualization's marker data.
     *
     * `include_dispersion` is what supplies `SD_First_Yes_in_Days`, read by
     * `map-visualization-marker-iw.component.ts`; without it that column is absent.
     * Chunked per `siteLevelChunks`/`postSiteChunk` above and issued sequentially -- the
     * time budget this works around is wall-clock per Lambda invocation, not per-origin
     * concurrency, so parallel chunk requests would not help and would only make a 413
     * harder to attribute to a specific range.
     */
    getSiteLevelData(params: HttpParams): Promise<any[]> {
        if (!this.serviceUtils.config.servicesApiRoot) {
            return Promise.reject(new Error(
                'No site level phenometrics endpoint configured (servicesApiRoot)'));
        }
        const url = this.serviceUtils.servicesApiUrl('/v1/data/site_phenometrics');
        const body = buildPhenometricsBody(params);
        body.include_climate = '1';
        body.include_dispersion = '1';
        if (params.has('num_days_quality_filter')) {
            body.num_days_quality_filter = Number(params.get('num_days_quality_filter'));
        }
        const chunks = siteLevelChunks(body.startDate, body.endDate);
        return chunks.reduce(
            (promise, chunk) => promise.then(rows => postSiteChunk(this.serviceUtils, url, body, chunk)
                .then(chunkRows => rows.concat(chunkRows))),
            Promise.resolve([] as any[])
        ).then(rows => rows.map(lowercaseKeys));
    }

    /**
     * Magnitude phenometrics -- replaces the legacy
     * `/npn_portal/observations/getMagnitudeData.json` POST made by `ActivityCurve.loadData`.
     * Unlike site level, `magnitude_metrics` anchors its buckets to `start_date` and is not
     * windowed server-side, and callers already issue one request per curve per year, so no
     * chunking is needed here.
     */
    getMagnitudeData(params: HttpParams): Promise<any[]> {
        if (!this.serviceUtils.config.servicesApiRoot) {
            return Promise.reject(new Error(
                'No magnitude phenometrics endpoint configured (servicesApiRoot)'));
        }
        const url = this.serviceUtils.servicesApiUrl('/v1/data/magnitude_phenometrics');
        const body = buildPhenometricsBody(params);
        const frequency = params.get('frequency');
        body.frequency = frequency === 'months' ? frequency : Number(frequency);
        return this.serviceUtils.cachedPost<any[]>(url, body, { 'Content-Type': 'application/json' })
            .then(rows => (rows || []).map(lowercaseKeys));
    }

    /**
     * Individual phenometrics -- replaces the legacy
     * `/npn_portal/observations/getSummarizedData.json` POST made when
     * `individualPhenometrics` is enabled on `SiteOrSummaryVisSelection`.
     */
    getIndividualPhenometrics(params: HttpParams): Promise<any[]> {
        if (!this.serviceUtils.config.servicesApiRoot) {
            return Promise.reject(new Error(
                'No individual phenometrics endpoint configured (servicesApiRoot)'));
        }
        const url = this.serviceUtils.servicesApiUrl('/v1/data/individual_phenometrics');
        const body = toIndividualPhenometricsBody(params);
        // memory tier: a single species-year measures ~3M characters, more than the whole
        // ~5MB sessionStorage origin quota once UTF-16 accounting is applied, so this
        // could never be cached there -- and every attempt used to wipe the cache clean.
        return this.serviceUtils.memCachedPost<any[]>(url, body, { 'Content-Type': 'application/json' })
            .then(rows => (rows || []).map(lowercaseKeys))
            .catch(err => {
                if (err && err.status === 413) {
                    throw new Error(
                        'Individual phenometrics query returned too much data (413) -- ' +
                        'narrow the date range, species, or station selection and try again.');
                }
                throw err;
            });
    }
}
