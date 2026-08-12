import { Injectable } from '@angular/core';

import { NpnServiceUtils } from './npn-service-utils.service';

/**
 * Data-layer for Phenology Observation Portal saved searches -- `{servicesApiRoot}/v1/saved_search`,
 * which replaces the legacy `{popApiRoot}/search` POST that `ExportControlComponent` used to
 * make inline, per REFACTORING-NOTES.md section 1 (`PopService` was listed there as
 * "missing"): "One service per data source or domain, each owning its endpoints, with
 * nothing else permitted to build a URL."
 *
 * It owns the two URLs the export flow needs, which live under different roots and are
 * different kinds of thing:
 *
 * - `{servicesApiRoot}/v1/saved_search` -- the web service the search is saved to.
 * - `{observationPortalUrl}?search={hash}` -- the Phenology Observation Portal page the
 *   user is then sent to. A web app, not a service; nothing is requested from it here.
 *   Previously a string literal in `ExportControlComponent` interpolating
 *   `environment.production`, which is what took it out of `NpnConfiguration`'s reach.
 *
 * Note that the hash is minted by `servicesApiRoot` and redeemed by the portal, so the two
 * have to agree on where saved searches live. A dev services host paired with the
 * production portal will save successfully and then 404 on open.
 *
 * Verified against https://services2-dev.usanpn.org/v1/saved_search on 2026-08-12: a POST
 * of a real `POPInput` answered `200 {"saved_search_hash":"a64406..."}` and
 * `GET /v1/saved_search/a64406...` returned that body verbatim.
 */
@Injectable()
export class SavedSearchService {
    constructor(private serviceUtils: NpnServiceUtils) {}

    /**
     * Saves a search and resolves the md5 hex digest identifying it.
     *
     * Deliberately uncached. The endpoint is content-addressed -- the same `searchJson`
     * always yields the same hash -- so a cache could only ever save a round trip, and it
     * would do so by suppressing the server side save counter that each POST increments.
     * Export is a user-initiated, once-per-click action; the round trip is not worth
     * distorting that counter for.
     *
     * The hash is order-sensitive: the same filters serialized in a different key order
     * produce a different hash. Nothing here reorders keys, so a caller that builds its
     * body consistently gets a stable hash.
     *
     * @param searchJson The search definition. Free-form -- the server stores and returns
     *                   it verbatim without validating or interpreting it. Must be an
     *                   object, and must serialize to under 5MB or the endpoint answers 413.
     *                   Today this is always a completed `POPInput` (`vis-selection.ts`),
     *                   which is not referenced by type here because `visualizations`
     *                   imports `common` and not the other way around.
     */
    saveSearch(searchJson: any): Promise<string> {
        if (!this.serviceUtils.config.servicesApiRoot) {
            return Promise.reject(new Error(
                'No saved search endpoint configured (servicesApiRoot)'));
        }
        return this.serviceUtils.post<any>(
            this.serviceUtils.servicesApiUrl('/v1/saved_search'),
            { searchJson },
            { 'Content-Type': 'application/json' }
        ).then(response => response.saved_search_hash);
    }

    /**
     * Saves a search and resolves the Phenology Observation Portal URL that opens it, ready
     * to hand to `window.open` -- the whole export flow, so that no caller has to know it
     * takes two steps against two hosts.
     *
     * The portal is checked before the POST rather than after, so a missing
     * `observationPortalUrl` fails immediately instead of saving a search that then has
     * nowhere to be opened.
     */
    exportUrl(searchJson: any): Promise<string> {
        const portalUrl = this.serviceUtils.config.observationPortalUrl;
        if (!portalUrl) {
            return Promise.reject(new Error(
                'No observation portal configured (observationPortalUrl)'));
        }
        return this.saveSearch(searchJson)
            .then(hash => `${portalUrl}?search=${hash}`);
    }
}
