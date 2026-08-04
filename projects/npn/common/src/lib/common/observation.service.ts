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
function collectLegacyIds(params: HttpParams, legacyName: string): number[] {
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
 * -- `phenophase_id[n]`, `num_days_quality_filter_individual`, `climate_data`,
 * `request_src` -- is deliberately dropped rather than forwarded. Empty arrays are
 * acceptable for fields this client doesn't populate yet.
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
        integrated_datasets: []
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
 * Data-layer for site-level and individual phenology observations -- replaces the legacy
 * `/npn_portal/observations/getSiteLevelData.json` and `getSummarizedData.json` REST calls
 * made from `SiteOrSummaryVisSelection`, per REFACTORING-NOTES.md §1 (`ObservationService`
 * was listed there as "missing").
 */
@Injectable()
export class ObservationService {
    constructor(private serviceUtils: NpnServiceUtils) {}

    /**
     * STUB: not yet wired to a real endpoint -- the replacement pipe hasn't been decided.
     * Always resolves an empty dataset so the call site and the rest of the fetch/filter
     * pipeline can be exercised end-to-end ahead of that endpoint landing here, the same
     * way `SpeciesFilterService` and `PhenophaseFilterService` did once their pipes were
     * known.
     */
    getSiteLevelData(params: HttpParams): Promise<any[]> {
        return Promise.resolve([]);
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
        return this.serviceUtils.cachedPost<any[]>(url, body, { 'Content-Type': 'application/json' })
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
