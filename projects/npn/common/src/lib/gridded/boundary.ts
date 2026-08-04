import { Geometry } from "geojson";

/**
 * `type_id` of the "US States" boundary type, per `/v1/boundaries/types`.
 *
 * Boundaries of this type are resolved to stations through `find_stations`' `states`
 * parameter -- their `short_name` is the two letter state code -- instead of their
 * geometry. State outlines are by far the worst case for the geometry path (Maine is 136
 * separate polygons, Florida 66) and the pipe rejects MULTIPOLYGON, so this turns the
 * most common boundary selection from 136 requests into one.
 */
export const US_STATES_BOUNDARY_TYPE_ID = 1;

export interface BoundaryType {
    type_id: number;
    name: string;
    description: string;
}

export interface FullGeometry {
    geometry: Geometry;
}

export interface Boundary {
    boundary_id: number;
    /**
     * Was declared as the literal `1`, which made every other boundary type
     * unassignable; the endpoint returns many (see `/v1/boundaries/types`).
     */
    type_id: number;
    name: string;
    short_name: string;
    /**
     * Optional: `/v1/boundaries` returns geometry only when asked (`return_geometry=1`),
     * and as of 2026-08-04 that flag is accepted but not yet implemented, so rows come
     * back without it. A boundary without geometry can be listed but not drawn --
     * `BoundaryService.boundariesToFeatureCollection` skips those rather than
     * dereferencing `full.geometry` blind.
     */
    full?: FullGeometry;
}
