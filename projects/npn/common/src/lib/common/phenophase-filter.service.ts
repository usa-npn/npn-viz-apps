import { Injectable } from '@angular/core';

import { NpnServiceUtils } from './npn-service-utils.service';
import { TinybirdPipeResponse } from './species-filter.service';
import { Phenophase } from './phenophase';
import { TaxonomicSpeciesRank } from './species';

/**
 * Params for the `species_phenophases` Tinybird pipe, translated from the single
 * species id + optional date(s) that `SpeciesService` already has on hand.  When `date`
 * is omitted the legacy `getPhenophasesForSpecies.json` behavior (return every
 * phenophase ever defined for the species) is requested via `return_all`.
 *
 * `endDate` turns the point-in-time lookup into a range: the pipe answers with the
 * union of everything defined at any point between `date` and `endDate`, one row per
 * phenophase.  It is only meaningful alongside `date` and is ignored without one.
 */
export function toSpeciesPhenophasesParams(speciesId: string | number, date?: string, endDate?: string): { [key: string]: string } {
    const params: { [key: string]: string } = {
        species_ids: `${speciesId}`
    };
    if (date) {
        params.date = date;
        if (endDate) {
            params.end_date = endDate;
        }
    } else {
        params.return_all = 'true';
    }
    return params;
}

const TAXON_RANK_PARAM: { [rank: string]: string } = {
    [TaxonomicSpeciesRank.CLASS]: 'class_ids',
    [TaxonomicSpeciesRank.ORDER]: 'order_ids',
    [TaxonomicSpeciesRank.FAMILY]: 'family_ids',
    [TaxonomicSpeciesRank.GENUS]: 'genus_ids'
};

/**
 * Params for the `taxon_phenophases` Tinybird pipe.  `rank` selects which of the
 * pipe's four id parameters (`class_ids`/`order_ids`/`family_ids`/`genus_ids`) carries
 * `taxonId`; the legacy `getPhenophasesForTaxon.json` REST call took the equivalent
 * singular `*_id` and dispatched on the same rank.
 */
export function toTaxonPhenophasesParams(rank: TaxonomicSpeciesRank, taxonId: string | number, date?: string, endDate?: string): { [key: string]: string } {
    const idParam = TAXON_RANK_PARAM[rank];
    if (!idParam) {
        throw new Error(`toTaxonPhenophasesParams: unsupported rank "${rank}"`);
    }
    const params: { [key: string]: string } = {
        [idParam]: `${taxonId}`
    };
    if (date) {
        params.date = date;
        if (endDate) {
            params.end_date = endDate;
        }
    } else {
        params.return_all = 'true';
    }
    return params;
}

/**
 * Data-layer for the `species_phenophases` and `taxon_phenophases` Tinybird pipes --
 * owns the endpoint URLs, the request translation, and unwrapping the response
 * envelope, so `SpeciesService` deals only in `Phenophase[]`.
 *
 * Second pair of endpoints named in REFACTORING-NOTES.md to move fetch+parse out of
 * `species.service.ts`, following the same shape as `SpeciesFilterService`.
 */
@Injectable()
export class PhenophaseFilterService {
    constructor(private serviceUtils: NpnServiceUtils) {}

    getPhenophasesForSpecies(speciesId: string | number, date?: string, endDate?: string): Promise<Phenophase[]> {
        const url = this.serviceUtils.tinybirdUrl('/v0/pipes/species_phenophases.json');
        const params = toSpeciesPhenophasesParams(speciesId, date, endDate);
        return this.serviceUtils.cachedGet(url, params)
            .then((response: TinybirdPipeResponse<Phenophase>) => response.data);
    }

    getPhenophasesForTaxon(rank: TaxonomicSpeciesRank, taxonId: string | number, date?: string, endDate?: string): Promise<Phenophase[]> {
        const url = this.serviceUtils.tinybirdUrl('/v0/pipes/taxon_phenophases.json');
        const params = toTaxonPhenophasesParams(rank, taxonId, date, endDate);
        return this.serviceUtils.cachedGet(url, params)
            .then((response: TinybirdPipeResponse<Phenophase>) => response.data);
    }
}
