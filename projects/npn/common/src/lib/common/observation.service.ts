import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';

import { NpnServiceUtils } from './npn-service-utils.service';

/**
 * Data-layer for site-level phenology observations -- intended to replace the legacy
 * `/npn_portal/observations/getSiteLevelData.json` REST call made from
 * `SiteOrSummaryVisSelection`, per REFACTORING-NOTES.md §1 (`ObservationService` was
 * listed there as "missing").
 *
 * STUB: not yet wired to a real endpoint -- the replacement pipe hasn't been decided.
 * `getSiteLevelData` always resolves an empty dataset so the call site and the rest of
 * the fetch/filter pipeline can be exercised end-to-end ahead of that endpoint landing
 * here, the same way `SpeciesFilterService` and `PhenophaseFilterService` did once
 * their pipes were known.
 */
@Injectable()
export class ObservationService {
    constructor(private serviceUtils: NpnServiceUtils) {}

    getSiteLevelData(params: HttpParams): Promise<any[]> {
        return Promise.resolve([]);
    }
}
