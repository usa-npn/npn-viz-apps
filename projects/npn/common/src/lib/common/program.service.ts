import { Injectable } from '@angular/core';

import { NpnServiceUtils } from './npn-service-utils.service';
import { Program } from './program';

/**
 * Data-layer for Local Phenology Programs -- `{servicesApiRoot}/v1/programs`, which
 * replaces the legacy `{dataApiRoot2}/v0/networks` lookups that used to live on
 * `NetworkService` as `getNetwork`/`getNetworks`.
 *
 * Two differences from what it replaces, both deliberate:
 *
 * - `/v1/programs/{id}` returns a single object, not a one-element array, so
 *   `getProgram` resolves a `Program` and callers no longer index `[0]` (the `@todo`
 *   the old `getNetwork` carried).
 * - A program that does not exist resolves `undefined` rather than rejecting. Both
 *   callers need to distinguish "no such program" from "the request failed", and the
 *   old array-length check was how they did it.
 *
 * Follows `SpeciesFilterService`/`ObservationService`/`BoundaryApiService` per
 * REFACTORING-NOTES.md section 1, target shape: "One service per data source or domain,
 * each owning its endpoints, with nothing else permitted to build a URL."
 */
@Injectable()
export class ProgramService {
    constructor(private serviceUtils: NpnServiceUtils) {}

    /**
     * A single program by id, or `undefined` if no program has that id.
     *
     * Verified against https://services2-dev.usanpn.org/v1/programs/295 on 2026-08-11:
     * 200 with a bare `Program` object; an unknown id answers
     * `404 {"error":"Program not found"}`.
     *
     * The 404 is not cached -- `cachedGet` treats any falsy cached value as a miss, so
     * there is no way to record "no such program" through it. Callers that read this
     * from a template guard their own repeat lookups.
     */
    getProgram(programId: number | string): Promise<Program> {
        if (!this.serviceUtils.config.servicesApiRoot) {
            return Promise.reject(new Error(
                'No programs endpoint configured (servicesApiRoot)'));
        }
        return this.serviceUtils.cachedGet(this.serviceUtils.servicesApiUrl(`/v1/programs/${programId}`))
            .catch(err => {
                if (err && err.status === 404) {
                    return undefined;
                }
                throw err;
            });
    }

    /**
     * The programs matching `programIds`, in request order, with any id that has no
     * program dropped.
     *
     * One request per id. The endpoint cannot batch: `program_id` on `/v1/programs` is a
     * single integer, and both `program_id=295,724` and a repeated `program_id` answer
     * `400 {"error":"Invalid query parameters"}` (verified 2026-08-11). Fetching the
     * unfiltered list instead is worse -- 911 programs, ~750K characters, which exceeds
     * `SESSION_CACHE_MAX_ENTRY_CHARS` and so could not be cached -- to resolve the
     * handful of ids these callers ask for.
     */
    getPrograms(programIds: (number | string)[]): Promise<Program[]> {
        return Promise.all((programIds || []).map(id => this.getProgram(id)))
            .then(programs => programs.filter(p => !!p));
    }
}
