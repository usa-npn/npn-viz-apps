import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";

import { BoundaryApiService } from "./boundary-api.service";
import { Boundary, BoundaryType, FullGeometry } from "./boundary";

// re-exported so existing `import { Boundary, BoundaryType } from '@npn/common'`
// call sites keep resolving now that the interfaces live in ./boundary
export { Boundary, BoundaryType, FullGeometry };

interface BoundaryCache {
    [typeId:string]: Promise<Boundary[]>;
}

/**
 * Domain-layer for boundaries: local caching, ordering, and translation to the GeoJSON
 * the map consumes.  All endpoint URLs live in `BoundaryApiService`.
 */
@Injectable()
export class BoundaryService {
    private _boundaryCache:BoundaryCache = {};

    constructor(private boundaryApi:BoundaryApiService){}

    getBoundaryTypes():Observable<BoundaryType[]> {
        return from(this.boundaryApi.getBoundaryTypes());
    }

    getBoundaries(typeId:number):Observable<Boundary[]> {
        if(!this._boundaryCache[typeId]) {
            this._boundaryCache[typeId] = this.boundaryApi.getBoundaries(typeId)
                // `||''` because one nameless record would otherwise throw out of the sort
                // and fail the whole request
                .then(boundaries => boundaries.sort((a,b) => (a.name||'').localeCompare(b.name||'')))
                // the promise is cached before it settles (good: dedupes concurrent
                // requests), so drop it on failure -- otherwise one failed page poisons
                // this type for the rest of the session and no retry ever reaches the network
                .catch(err => {
                    delete this._boundaryCache[typeId];
                    throw err;
                });
        }
        return from(this._boundaryCache[typeId]);
    }

    boundariesToFeatureCollection(boundaries:Boundary[]):any/*<FeatureCollection>*/ {
        const drawable = boundaries.filter(b => !!b.full && !!b.full.geometry);
        if(drawable.length !== boundaries.length) {
            // expected until `/v1/boundaries?return_geometry=1` is implemented server-side;
            // dereferencing b.full.geometry blind here throws inside loadFeatures(), which
            // has no catch, leaving the boundary picker spinning forever
            console.warn(
                `BoundaryService: ${boundaries.length-drawable.length}/${boundaries.length} ` +
                `boundaries have no geometry and cannot be drawn.`);
        }
        return {
            type: 'FeatureCollection',
            features: drawable.map(b => ({
                type: 'Feature',
                geometry: b.full.geometry,
                properties: {...b,full:undefined}
            }))
        }
    }
}
