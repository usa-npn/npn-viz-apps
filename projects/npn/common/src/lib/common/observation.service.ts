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
 * The taxonomic/phenophase rank id keys a plot or curve may set on its `HttpParams`, and
 * the `taxon` value each implies. `phenophase_id`/`pheno_class_id` drive `phenophase_grain`
 * instead (see `buildPhenometricsBody` below) so they have no entry here.
 *
 * Grain is orthogonal to which id array is populated -- `magnitude_metrics.pipe:30` is
 * explicit that grain is never inferred server-side from the filter supplied, so both the
 * id array *and* `taxon`/`phenophase_grain` must be sent. Deriving them from the key name
 * is safe here only because `getSpeciesPlotKeys` picks the same key from the plot/curve's
 * `speciesRank`/`phenophaseRank`, so the two cannot disagree.
 *
 * All three endpoint body builders pluralize these the same way (`family_id` ->
 * `family_ids`), so the list is shared rather than duplicated per builder.
 */
export const RANK_KEYS = ['species_id', 'genus_id', 'family_id', 'order_id', 'class_id',
    'phenophase_id', 'pheno_class_id'];
export const TAXON_BY_KEY: { [key: string]: string } = {
    species_id: 'species', genus_id: 'genus', family_id: 'family',
    order_id: 'order', class_id: 'class'
};

/**
 * Translates the `HttpParams` built by `SiteOrSummaryVisSelection.toURLSearchParams()`
 * into the body required by `/v1/data/individual_phenometrics`.
 *
 * The schema is `additionalProperties: false`, so anything not named here -- `climate_data`,
 * `taxonomy_aggregate`/`pheno_class_aggregate`, `request_src` -- is deliberately dropped
 * rather than forwarded. Empty arrays are acceptable for fields this client doesn't populate.
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
 *
 * The rank id arrays and `num_days_quality_filter_individual` are forwarded per `RANK_KEYS`
 * below. When this retrofit was written (2026-07-29, `docs/plans/summarized-data.md`) the
 * endpoint accepted neither and both were dropped; a plot at a rank above species therefore
 * sent an empty `species_ids` with no phenophase filter at all, i.e. a bare date range --
 * which for the Soapberry-family seasonal story meant an unfiltered 11-year national query.
 * Re-verified against the live `/openapi.json` on 2026-08-17: `class_ids`, `order_ids`,
 * `family_ids`, `genus_ids`, `phenophase_ids`, `pheno_class_ids` and
 * `num_days_quality_filter_individual` are all part of the request schema now.
 *
 * `filterLqSummaryData` still re-applies the day-count cap client-side. That is not
 * redundant: it also rejects the `null` the API emits for an absent value, and it keeps the
 * filter meaningful for any caller whose params carry no quality filter at all.
 */
export function toIndividualPhenometricsBody(params: HttpParams): any {
    const body: any = {
        startDate: params.get('start_date') || '',
        endDate: params.get('end_date') || '',
        state: [],
        species_ids: [],
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
    RANK_KEYS.forEach(key => {
        const ids = collectLegacyIds(params, key);
        if (ids.length) {
            body[`${key}s`] = ids;
        }
    });
    if (params.has('num_days_quality_filter_individual')) {
        body.num_days_quality_filter_individual =
            Number(params.get('num_days_quality_filter_individual'));
    }
    if (params.has('taxonomy_aggregate')) {
        body.include_taxonomic_detail = '1';
    }
    if (params.has('pheno_class_aggregate')) {
        body.include_phenophase_detail = '1';
    }
    return body;
}

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

interface DateRange {
    startDate: string;
    endDate: string;
}

/**
 * Both `site_phenometrics` and `individual_phenometrics` decompose `[startDate, endDate]`
 * into one window per phenological year server-side and neither carries a year in its grain
 * key, so N client chunks of a range return exactly the rows one call over the whole range
 * would -- chunking is purely to stay inside the per-request response budget the middleware
 * enforces across those windows.
 *
 * What trips it is cumulative cost across windows, and byte volume and wall-clock are
 * entangled proxies for each other -- do not assume either one alone. Two mechanisms are
 * known: a 25MB byte budget, and `tinybirdSyncExport.ts:230`'s abort when under 5s of Lambda
 * time remains before the next window, which returns the **same 413 body** with no
 * distinguishing field (`docs/plans/magnitude-site-level-data.md`). Site level fails on time
 * at 7% of the byte budget; individual, measured 2026-08-17 with the Soapberry-family story's
 * filter (national), passed 2012-2017 at 5.28MB/15.4s but failed 2016-2019 at 12.4s -- fewer
 * windows and less elapsed time, more data per window. Whichever mechanism dominates, the
 * remedy is the same: fewer years per request.
 *
 * Do not size chunks off the `limit_bytes` in the 413 body. It reports `26214400` (25MB)
 * while individual queries fail somewhere between 5.28MB and ~5.75MB.
 *
 * Sizing is a starting guess, not a guarantee: a dense species-level selection can exceed
 * the budget inside a single year (`docs/plans/summarized-data.md` measured 1 species x 5
 * years at 36.9MB). `postChunk`'s split-and-retry on 413 is what actually makes this robust;
 * the grid only keeps the common case down to one round trip per chunk.
 */
const SITE_CHUNK_YEARS = 4;

/**
 * 3 rather than 4: for the Soapberry-family story's filter the worst 3-year window measures
 * ~4.5MB (2020-2022) against ~5.75MB for the worst 4-year one (2016-2019), which 413s.
 */
const INDIVIDUAL_CHUNK_YEARS = 3;

function yearOf(dateStr: string): number {
    return parseInt(dateStr.slice(0, 4), 10);
}

/**
 * Chunks are aligned to a fixed `chunkYears` grid (`floor(year/chunkYears)*chunkYears`)
 * rather than simply walked from the start date, so that interior chunks keep the same cache
 * key when a user nudges only one end of the range. Every selection that reaches these
 * endpoints builds calendar (Jan 1 - Dec 31) ranges, so grid boundaries coincide with the
 * server's own window boundaries; a water-year range would need this revisited.
 */
function yearChunks(startDate: string, endDate: string, chunkYears: number): DateRange[] {
    const startYear = yearOf(startDate);
    const endYear = yearOf(endDate);
    const gridStart = Math.floor(startYear / chunkYears) * chunkYears;
    const chunks: DateRange[] = [];
    for (let s = gridStart; s <= endYear; s += chunkYears) {
        const chunkStartYear = Math.max(s, startYear);
        const chunkEndYear = Math.min(s + chunkYears - 1, endYear);
        if (chunkStartYear > chunkEndYear) {
            continue;
        }
        chunks.push({
            // first/last chunks clip to the actual requested date (not just the year) so
            // e.g. a mid-year start isn't widened back out to the full grid cell -- doing
            // so would push that chunk back up to a full cell and re-risk the byte cap.
            startDate: chunkStartYear === startYear ? startDate : `${chunkStartYear}-01-01`,
            endDate: chunkEndYear === endYear ? endDate : `${chunkEndYear}-12-31`
        });
    }
    return chunks;
}

/**
 * Halves a chunk by year, in response to a 413. Splitting continues only while more than
 * one calendar year remains in the chunk -- a single year that still 413s has nowhere
 * further to split and is a terminal failure (see `postChunk`).
 */
function splitChunk(chunk: DateRange): DateRange[] {
    const startYear = yearOf(chunk.startDate);
    const endYear = yearOf(chunk.endDate);
    const midYear = startYear + Math.floor((endYear - startYear) / 2);
    return [
        { startDate: chunk.startDate, endDate: `${midYear}-12-31` },
        { startDate: `${midYear + 1}-01-01`, endDate: chunk.endDate }
    ];
}

/**
 * Posts a single chunk, splitting and retrying on 413 (see `splitChunk`). Any other error
 * rejects immediately rather than being retried -- partial data on a scatter plot or map is
 * indistinguishable from years genuinely having no observations, so a request that fails
 * outright must not resolve with only some of its chunks.
 *
 * `label` names the query in the terminal message a caller ends up surfacing to the user.
 */
function postChunk(
    serviceUtils: NpnServiceUtils, url: string, bodyBase: any, chunk: DateRange, label: string
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
                        `${label} query returned too much data (413) for ${startYear} -- ` +
                        'narrow the species, station, or phenophase selection and try again.');
                }
                const [a, b] = splitChunk(chunk);
                return postChunk(serviceUtils, url, bodyBase, a, label)
                    .then(aRows => postChunk(serviceUtils, url, bodyBase, b, label)
                        .then(bRows => aRows.concat(bRows)));
            }
            throw err;
        });
}

/**
 * Chunks `body`'s date range and posts the chunks **sequentially**, concatenating the rows.
 * The budget being worked around is per-request on the middleware side, not per-origin
 * concurrency, so parallel chunk requests would not help and would only make a 413 harder to
 * attribute to a specific range.
 */
function postChunked(
    serviceUtils: NpnServiceUtils, url: string, body: any, chunkYears: number, label: string
): Promise<any[]> {
    return yearChunks(body.startDate, body.endDate, chunkYears).reduce(
        (promise, chunk) => promise.then(rows => postChunk(serviceUtils, url, body, chunk, label)
            .then(chunkRows => rows.concat(chunkRows))),
        Promise.resolve([] as any[])
    ).then(rows => rows.map(lowercaseKeys));
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
     * Chunked per `postChunked`/`SITE_CHUNK_YEARS` above.
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
        return postChunked(this.serviceUtils, url, body, SITE_CHUNK_YEARS, 'Site level');
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
     *
     * Chunked per `postChunked`/`INDIVIDUAL_CHUNK_YEARS` above. The scatter plot's default
     * range is 16 years, and the Soapberry-family seasonal story's 2012-2022 exceeded the
     * middleware's response budget as a single request even with every filter applied, so
     * this is the normal path rather than an edge case.
     *
     * `postChunked` posts through `memCachedPost` -- the memory tier, not sessionStorage: a
     * single species-year measures ~3M characters, more than the whole ~5MB sessionStorage
     * origin quota once UTF-16 accounting is applied, so this could never be cached there,
     * and every attempt used to wipe the cache clean.
     */
    getIndividualPhenometrics(params: HttpParams): Promise<any[]> {
        if (!this.serviceUtils.config.servicesApiRoot) {
            return Promise.reject(new Error(
                'No individual phenometrics endpoint configured (servicesApiRoot)'));
        }
        const url = this.serviceUtils.servicesApiUrl('/v1/data/individual_phenometrics');
        const body = toIndividualPhenometricsBody(params);
        return postChunked(
            this.serviceUtils, url, body, INDIVIDUAL_CHUNK_YEARS, 'Individual phenometrics');
    }
}
