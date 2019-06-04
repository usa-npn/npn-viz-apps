import { Injectable } from "@angular/core";
import { NpnServiceUtils } from "../common";
import { Observable, from, of } from "rxjs";
import { map, tap } from 'rxjs/operators';
import { Geometry } from "geojson";


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
    type_id: 1;
    name: string;
    short_name: string;
    full: FullGeometry;
}

const BOUNDARY_API_ROOT = '/v0/boundaries';

interface BoundaryCache {
    [typeId:string]: Promise<Boundary[]>;
}

@Injectable()
export class BoundaryService {
    private _boundaryCache:BoundaryCache = {};

    constructor(private serviceUtils:NpnServiceUtils){}

    getBoundaryTypes():Observable<BoundaryType[]> {
        return from(
            this.serviceUtils.cachedGet(this.serviceUtils.dataApiUrl2(`${BOUNDARY_API_ROOT}/types`))
        );
    }

    getBoundaries(typeId:number):Observable<Boundary[]> {
        if(!this._boundaryCache[typeId]) {
            this._boundaryCache[typeId] = this.serviceUtils.get(
                this.serviceUtils.dataApiUrl2(`${BOUNDARY_API_ROOT}`),
                {type_id:`"${typeId}"`}
            )
            .then(boundaries => (boundaries||[]).sort((a,b) => a.name.localeCompare(b.name)));
        }
        return from(this._boundaryCache[typeId]);
    }

    boundariesToFeatureCollection(boundaries:Boundary[]):any/*<FeatureCollection>*/ {
        return {
            type: 'FeatureCollection',
            features: boundaries.map(b => ({
                type: 'Feature',
                geometry: b.full.geometry,
                properties: {...b,full:undefined}
            }))
        }
    }
}