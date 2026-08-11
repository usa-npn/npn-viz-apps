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
 * the JSON `{"geometry":{"type":"MultiPolygon","coordinates":[...]}}`.
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
 * `simple` (base64) is what `/v1/boundaries` returns today; a nested `full.geometry` or a
 * flat `geometry` are also accepted, since `return_geometry` is not yet honored
 * server-side and the shape it eventually delivers is not settled. All three normalize to
 * the nested `full.geometry` that `boundariesToFeatureCollection` reads, so everything
 * downstream of here sees one shape.
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
     */
    getBoundaryTypes(): Promise<BoundaryType[]> {
        if (!this.serviceUtils.config.servicesApiRoot) {
            return Promise.reject(new Error(
                'No boundary types endpoint configured (servicesApiRoot)'));
        }
        return this.serviceUtils.cachedGet(this.serviceUtils.servicesApiUrl('/v1/boundaries/types'))
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
     * - `type_id` takes a plain integer.
     *
     * Pages are fetched in sequence rather than in parallel because the page count isn't
     * knowable up front -- the short page that ends the walk is also what tells us it was
     * the last one.
     */
    getBoundaries(typeId: number): Promise<Boundary[]> {
        if (!this.serviceUtils.config.servicesApiRoot) {
            return Promise.reject(new Error(
                'No boundaries endpoint configured (servicesApiRoot)'));
        }
        return this.getBoundaryPage(typeId, 0, []);
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
}
