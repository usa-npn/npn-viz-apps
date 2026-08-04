import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Geometry } from 'geojson';

import { NpnServiceUtils } from './npn-service-utils.service';
import { TinybirdPipeResponse } from './species-filter.service';

/**
 * A row from the `find_stations` pipe. Deliberately not typed as `Station` -- the pipe
 * returns only these four columns (no `network_id`), verified against the live pipe on
 * 2026-08-04.
 */
export interface FoundStation {
    station_id: number;
    station_name: string;
    latitude: number;
    longitude: number;
}

const ringToWkt = (ring: number[][]): string =>
    `(${ring.map(pair => `${pair[0]} ${pair[1]}`).join(',')})`;

const ringsToPolygonWkt = (rings: number[][][]): string =>
    `POLYGON (${rings.map(ringToWkt).join(',')})`;

/**
 * Converts a GeoJSON geometry into one WKT `POLYGON` string *per polygon*.
 *
 * A `MultiPolygon` produces one string per member polygon rather than a single
 * `MULTIPOLYGON`, because the pipe rejects that outright:
 * `400 ... read_wkt_exception ... Should start with 'POLYGON'` (verified 2026-08-04).
 * Callers therefore have to issue one request per returned string and union the results.
 *
 * GeoJSON coordinates are already `[lng,lat]`, which is the order the pipe expects --
 * confirmed by querying Arizona's real boundary WKT and getting Arizona stations back.
 */
export function geometryToPolygonWkts(geometry: Geometry): string[] {
    if (!geometry) {
        return [];
    }
    switch (geometry.type) {
        case 'Polygon':
            return [ringsToPolygonWkt(geometry.coordinates as number[][][])];
        case 'MultiPolygon':
            return (geometry.coordinates as number[][][][]).map(ringsToPolygonWkt);
        default:
            console.warn(`geometryToPolygonWkts: unsupported geometry type "${geometry.type}"`);
            return [];
    }
}

/**
 * Converts a hand-drawn boundary path into a WKT `POLYGON`.
 *
 * `PolygonBoundarySelection.data` holds `[lat,lng]` pairs (Google Maps order) and is not
 * closed, so this swaps each pair and repeats the first point -- the same transformation
 * the legacy `getStationsByLocation.json` call built inline in `vis-selection.ts`.
 */
export function latLngPathToPolygonWkt(path: number[][]): string {
    const closed = path.concat([path[0]]);
    return `POLYGON ((${closed.map(pair => `${pair[1]} ${pair[0]}`).join(',')}))`;
}

/**
 * How many polygon requests to have in flight at once.
 *
 * Not a tuning guess -- measured against the live pipe on 2026-08-04 using Maine, the
 * worst boundary in the US States type at 136 polygons:
 * - all 136 at once (a plain `Promise.all`) fails outright with connection timeouts;
 * - 6 at a time draws `429 Too many requests: retry after 1 seconds`;
 * - 3 at a time completes, with a handful of 429s absorbed by the retry below.
 */
const POLYGON_REQUEST_CONCURRENCY = 3;

/** The pipe's 429 says "retry after 1 seconds"; back off linearly from there. */
const RATE_LIMIT_MAX_RETRIES = 6;
const RATE_LIMIT_BASE_DELAY_MS = 1000;

const delay = (ms: number): Promise<void> =>
    new Promise<void>(resolve => setTimeout(() => resolve(), ms));

/**
 * Data-layer for the `find_stations` Tinybird pipe, which replaces both legacy station
 * lookups -- `/npn_portal/stations/getStationsByLocation.json` (polygon) and
 * `getStationsForBoundary.json` (boundary id).
 *
 * The pipe takes exactly one of `site_ids` / `states` / `polygon`; they are mutually
 * exclusive, so each method here sets exactly one. Sending none returns zero rows rather
 * than an error, which is why no method lets a caller pass an empty selector.
 *
 * Follows `SpeciesFilterService`/`PhenophaseFilterService` per REFACTORING-NOTES.md
 * section 1, which lists station fetching as living in three places, two of which aren't
 * the station service.
 */
@Injectable()
export class StationFilterService {
    constructor(private serviceUtils: NpnServiceUtils) {}

    /**
     * POST rather than GET: a single real boundary polygon runs to 24KB of WKT
     * (Louisiana's largest ring), far past what belongs in a URL. The pipe accepts
     * form-encoded POST -- verified with that exact 24KB polygon on 2026-08-04.
     */
    private findStations(params: { [key: string]: string }): Promise<FoundStation[]> {
        const url = this.serviceUtils.tinybirdUrl('/v0/pipes/find_stations.json');
        const body = new HttpParams({ fromObject: params }).toString();
        return this.serviceUtils.cachedPost(url, body)
            .then((response: TinybirdPipeResponse<FoundStation>) => (response && response.data) || []);
    }

    /** Stations inside a single WKT `POLYGON`. Use `geometryToPolygonWkts` to build it. */
    findStationsInPolygon(polygonWkt: string): Promise<FoundStation[]> {
        return this.findStations({ polygon: polygonWkt });
    }

    findStationsBySiteIds(siteIds: (number | string)[]): Promise<FoundStation[]> {
        return siteIds && siteIds.length
            ? this.findStations({ site_ids: siteIds.join(',') })
            : Promise.resolve([]);
    }

    findStationsByStates(states: string[]): Promise<FoundStation[]> {
        return states && states.length
            ? this.findStations({ states: states.join(',') })
            : Promise.resolve([]);
    }

    /** `findStationsInPolygon` with linear backoff on the pipe's 429 rate limit. */
    private findStationsInPolygonRetrying(polygonWkt: string, attempt: number = 0): Promise<FoundStation[]> {
        return this.findStationsInPolygon(polygonWkt)
            .catch(err => {
                if (err && err.status === 429 && attempt < RATE_LIMIT_MAX_RETRIES) {
                    return delay(RATE_LIMIT_BASE_DELAY_MS * (attempt + 1))
                        .then(() => this.findStationsInPolygonRetrying(polygonWkt, attempt + 1));
                }
                throw err;
            });
    }

    /**
     * Station ids contained by any of `polygonWkts`, deduped.
     *
     * Requests go out in bounded batches rather than one `Promise.all` over the whole
     * list -- see `POLYGON_REQUEST_CONCURRENCY` for the measurements behind that. A
     * boundary with many polygons is genuinely slow: Maine's 136 polygons take ~31s.
     */
    findStationIdsInPolygons(polygonWkts: string[]): Promise<number[]> {
        const ids: number[] = [];
        const collect = (stations: FoundStation[]) => stations.forEach(s => {
            if (ids.indexOf(s.station_id) === -1) {
                ids.push(s.station_id);
            }
        });
        const nextBatch = (from: number): Promise<number[]> => {
            if (from >= polygonWkts.length) {
                return Promise.resolve(ids);
            }
            return Promise.all(
                    polygonWkts.slice(from, from + POLYGON_REQUEST_CONCURRENCY)
                        .map(wkt => this.findStationsInPolygonRetrying(wkt)))
                .then(results => {
                    results.forEach(collect);
                    return nextBatch(from + POLYGON_REQUEST_CONCURRENCY);
                });
        };
        return nextBatch(0);
    }

    /**
     * Every station in any polygon of a geometry, deduped. One request per polygon --
     * see `geometryToPolygonWkts` for why a MultiPolygon cannot be sent as one request.
     */
    findStationIdsInGeometry(geometry: Geometry): Promise<number[]> {
        return this.findStationIdsInPolygons(geometryToPolygonWkts(geometry));
    }
}
