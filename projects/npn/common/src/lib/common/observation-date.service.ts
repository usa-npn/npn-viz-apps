import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';

import { NpnServiceUtils } from './npn-service-utils.service';
import { collectLegacyIds, RANK_KEYS, TAXON_BY_KEY } from './observation.service';

/**
 * A single row of `/v1/data/observation_dates`: one
 * (taxon id, phenophase grain id, year, day_of_year, status) combination.
 *
 * Exactly one of the taxon id fields is present, keyed to the request's `taxon`, and
 * exactly one of `phenophase_id`/`pheno_class_id`, keyed to its `phenophase_grain` --
 * which is why they are all optional here. `pheno_class_id` may additionally come back
 * `null`.
 */
export interface ObservationDateRow {
    species_id?: number;
    genus_id?: number;
    family_id?: number;
    order_id?: number;
    class_id?: number;

    phenophase_id?: number;
    pheno_class_id?: number;

    year: number;
    /** 1-366 */
    day_of_year: number;
    /** 1 reported yes, 0 reported no.  Numeric, not the string enum. */
    status: number;
    /**
     * The number of observation records behind this row.  Deliberately unread: it is
     * neither an intensity nor an abundance value, and the Calendar draws a tick for every
     * row it receives regardless.  Carried here because the endpoint returns it and it is
     * expected to gain a defined meaning later.
     */
    count: number;
}

/**
 * Translates the `HttpParams` built by `ObservationDateVisSelection.toURLSearchParams()`
 * (and `toGroupHttpParams`) into the body required by `/v1/data/observation_dates`.
 *
 * Deliberately close to `buildPhenometricsBody` (`observation.service.ts`) -- same filter
 * and grain shape, sharing the same `collectLegacyIds`/`RANK_KEYS`/`TAXON_BY_KEY` -- with
 * two differences:
 *
 * - `years` replaces `startDate`/`endDate`. The Calendar plots discrete, possibly
 *   non-contiguous years, so a range would force one request per year back on the caller.
 * - `group_id` is NOT dropped. The phenometrics endpoints have no equivalent field; this
 *   one does, as `program_ids` ("network" is now "program" -- the legacy param name
 *   survives only because it is what the selection hierarchy sets).
 *
 * The request schema is `additionalProperties: false`, so anything not named here is a
 * hard 400 rather than a silently ignored extra -- notably `request_src`, which this
 * endpoint's predecessor accepted and which the selection no longer sets.
 */
function buildObservationDatesBody(params: HttpParams): any {
    const body: any = {
        years: collectLegacyIds(params, 'year'),
        // an empty array is accepted and means "no station filter", exactly as omitting
        // the field does -- verified against the live endpoint
        stations: collectLegacyIds(params, 'station_id')
    };
    RANK_KEYS.forEach(key => {
        const ids = collectLegacyIds(params, key);
        if (ids.length) {
            body[`${key}s`] = ids;
            if (TAXON_BY_KEY[key]) {
                body.taxon = TAXON_BY_KEY[key];
            } else {
                body.phenophase_grain = key === 'pheno_class_id' ? 'pheno_class' : 'phenophase';
            }
        }
    });
    if (params.has('person_id')) {
        body.person_ids = [Number(params.get('person_id'))];
    }
    if (params.has('group_id')) {
        body.program_ids = [Number(params.get('group_id'))];
    }
    return body;
}

/**
 * Data-layer for the observation dates behind the Calendar visualization -- replaces the
 * legacy `/npn_portal/observations/getObservationDates.json` POST made from
 * `ObservationDateVisSelection`, the last `apiRoot` endpoint the vis tool depended on.
 *
 * Kept separate from `ObservationService` rather than folded into it: that service covers
 * the three `*_phenometrics` endpoints, which share a body shape and a date-range contract
 * this one deliberately breaks (see `buildObservationDatesBody`).
 */
@Injectable()
export class ObservationDateService {
    constructor(private serviceUtils: NpnServiceUtils) {}

    /**
     * One request per (taxon, phenophase_grain) bucket. The endpoint takes a single
     * `taxon` and a single `phenophase_grain` and answers with the full cross product of
     * the id arrays given, so callers pass every plot sharing a rank in one call and
     * discard the pairs they did not ask for.
     *
     * @param params Must carry `year[n]`, one taxon rank's `<rank>_id[n]` and one
     *               phenophase grain's ids; optionally `station_id[n]`, `person_id`,
     *               `group_id`.
     */
    getObservationDates(params: HttpParams): Promise<ObservationDateRow[]> {
        if (!this.serviceUtils.config.servicesApiRoot) {
            return Promise.reject(new Error(
                'No observation dates endpoint configured (servicesApiRoot)'));
        }
        const body = buildObservationDatesBody(params);
        // Each of these is a guaranteed 400 -- `years` is required, and exactly one taxon
        // and one phenophase id array must be present and non-empty (an empty
        // `species_ids` is rejected, unlike an empty `stations`). Failing here keeps the
        // error attributable to the selection rather than to an opaque upstream response.
        if (!body.years.length) {
            return Promise.reject(new Error('No years selected for observation dates'));
        }
        if (!body.taxon) {
            return Promise.reject(new Error('No taxon ids selected for observation dates'));
        }
        if (!body.phenophase_grain) {
            return Promise.reject(new Error('No phenophase ids selected for observation dates'));
        }
        const url = this.serviceUtils.servicesApiUrl('/v1/data/observation_dates');
        // memory tier: the cross product of three plots over three years measures ~1.1M
        // characters, well past the 500K `SESSION_CACHE_MAX_ENTRY_CHARS` ceiling, so the
        // sessionStorage tier would decline it and every redraw would re-request.
        return this.serviceUtils.memCachedPost<ObservationDateRow[]>(
                url, body, { 'Content-Type': 'application/json' })
            .then(rows => rows || [])
            .catch(err => {
                if (err && err.status === 413) {
                    throw new Error(
                        'Observation dates query returned too much data (413) -- ' +
                        'narrow the years, species, or station selection and try again.');
                }
                throw err;
            });
    }
}
