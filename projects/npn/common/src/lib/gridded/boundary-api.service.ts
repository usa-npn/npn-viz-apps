import { Injectable } from '@angular/core';
import { Geometry } from 'geojson';

import { NpnServiceUtils } from '../common';
import { Boundary, BoundaryType } from './boundary';

/**
 * The endpoint's hard maximum for `limit` -- `limit=30` is rejected with
 * `400 {"error":"Validation failed","details":[{"field":"limit","message":"Too big:
 * expected number to be <=25"}]}`. Always request the maximum: the page count is
 * round-trips, and there is no cheaper way to learn the total.
 */
export const BOUNDARIES_PAGE_SIZE = 25;

/**
 * Stop-loss on the paging loop. There is no total-count header or envelope on the
 * response, so termination depends entirely on the server eventually returning a short
 * page; this bounds the damage if it ever stops doing that. 200 pages is 5,000
 * boundaries, far beyond any real type.
 */
const MAX_BOUNDARY_PAGES = 200;

/**
 * Decodes the `simple` field returned by `/v1/boundaries?return_geometry=1`: base64 of
 * the JSON `{"geometry":{"type":"MultiPolygon","coordinates":[...]}}` -- the same
 * `FullGeometry` envelope the legacy `/v0/boundaries` returned as `full`, just encoded.
 * Coordinates are already `[lng,lat]`, the order `map.data.addGeoJson` expects.
 *
 * The row also carries `simple_wkt` (the same geometry as WKT). It is ignored: it would
 * need a WKT parser to reach the same place this gets to with a decode and a JSON.parse.
 */
function decodeSimpleGeometry(simple: string): Geometry {
    try {
        const parsed = JSON.parse(atob(simple));
        // tolerate both the `{geometry:...}` envelope and a bare geometry object
        return parsed && parsed.geometry ? parsed.geometry : parsed;
    } catch (e) {
        console.warn('BoundaryApiService: could not decode `simple` geometry', e);
        return undefined;
    }
}

/**
 * Normalizes a raw boundary row into `Boundary`.
 *
 * Geometry has arrived under three different names across these endpoints -- `simple`
 * (v1, base64, current), `full.geometry` (legacy v0), and a flat `geometry` -- so all
 * three are accepted and normalized to the nested `full.geometry` that
 * `boundariesToFeatureCollection` reads. Everything downstream of here sees one shape.
 */
export function normalizeBoundary(raw: any): Boundary {
    const geometry = raw.simple
        ? decodeSimpleGeometry(raw.simple)
        : (raw.full ? raw.full.geometry : raw.geometry);
    return {
        boundary_id: raw.boundary_id,
        type_id: raw.type_id,
        name: raw.name,
        short_name: raw.short_name,
        full: geometry ? { geometry } : undefined
    };
}

/**
 * Data-layer for the boundary endpoints -- owns the URLs, paging, and response
 * normalization so `BoundaryService` deals only in `BoundaryType[]`/`Boundary[]` and
 * builds no URLs of its own.
 *
 * Follows `SpeciesFilterService`/`PhenophaseFilterService`/`ObservationService` per
 * REFACTORING-NOTES.md section 1, target shape: "One service per data source or domain,
 * each owning its endpoints, with nothing else permitted to build a URL."
 */
@Injectable()
export class BoundaryApiService {
    constructor(private serviceUtils: NpnServiceUtils) {}

    /**
     * `/v1/boundaries/types`. Verified against
     * https://services2-dev.usanpn.org/v1/boundaries/types on 2026-08-04: 200 with a bare
     * array of `{type_id,name,description}` -- already exactly what `BoundaryType`
     * declares, so no response translation is needed here.
     *
     * Falls back to the legacy `{dataApiRoot2}/v0/boundaries/types` when `servicesApiRoot`
     * is unset. That is the deliberate state of `environment.prod.ts` (the v1 host is only
     * confirmed on dev), so production stays on the URL it works with today until that
     * config is filled in -- rather than losing the boundary picker entirely.
     */
    getBoundaryTypes(): Promise<BoundaryType[]> {
        const url = this.serviceUtils.config.servicesApiRoot
            ? this.serviceUtils.servicesApiUrl('/v1/boundaries/types')
            : this.serviceUtils.dataApiUrl2('/v0/boundaries/types');
        return this.serviceUtils.cachedGet(url)
            .then((types: BoundaryType[]) => types || []);
    }

    /**
     * Every boundary of a type, assembled from as many pages as it takes.
     *
     * Contract verified against the live endpoint on 2026-08-04:
     * - `limit` and `page` are both *required*; omitting either 400s.
     * - `limit` is capped at 25 (see `BOUNDARIES_PAGE_SIZE`).
     * - `page` is **0-indexed** -- `limit=2&page=0` returns the first two records,
     *   `page=1` the next two.
     * - The response is a bare array with no total count, in any header or envelope.
     *   Reading past the end returns `200 []`, so a short page is the only available
     *   end-of-results signal.
     * - `type_id` takes a plain integer (the legacy endpoint was sent `type_id="1"`).
     *
     * Pages are fetched in sequence rather than in parallel because the page count isn't
     * knowable up front -- the short page that ends the walk is also what tells us it was
     * the last one.
     */
    getBoundaries(typeId: number): Promise<Boundary[]> {
        return this.serviceUtils.config.servicesApiRoot
            ? this.getBoundaryPage(typeId, 0, [])
            : this.getBoundariesLegacy(typeId);
    }

    private getBoundaryPage(typeId: number, page: number, acc: Boundary[]): Promise<Boundary[]> {
        const url = this.serviceUtils.servicesApiUrl('/v1/boundaries');
        return this.serviceUtils.cachedGet(url, {
            type_id: `${typeId}`,
            limit: `${BOUNDARIES_PAGE_SIZE}`,
            page: `${page}`,
            // asks for the geometry the map needs; accepted but not yet honored server-side
            return_geometry: '1'
        }).then((rows: any[]) => {
            const received = rows || [];
            const boundaries = acc.concat(received.map(normalizeBoundary));
            if (received.length < BOUNDARIES_PAGE_SIZE) {
                return boundaries; // short page: that was the last one
            }
            if (page + 1 >= MAX_BOUNDARY_PAGES) {
                console.warn(
                    `BoundaryApiService: stopped paging boundaries for type_id=${typeId} at ` +
                    `${MAX_BOUNDARY_PAGES} pages; results may be truncated.`);
                return boundaries;
            }
            return this.getBoundaryPage(typeId, page + 1, boundaries);
        });
    }

    /**
     * Legacy `{dataApiRoot2}/v0/boundaries`, unpaged, used only when `servicesApiRoot` is
     * unconfigured (production, today). `type_id` stays quoted here because that is what
     * this endpoint has always been sent -- the unquoted form is correct for v1 but is not
     * verifiable against this one from here, and production currently depends on it.
     */
    private getBoundariesLegacy(typeId: number): Promise<Boundary[]> {
        return this.serviceUtils.get(
            this.serviceUtils.dataApiUrl2('/v0/boundaries'),
            { type_id: `"${typeId}"` }
        ).then((boundaries: any[]) => (boundaries || []).map(normalizeBoundary));
    }
}
