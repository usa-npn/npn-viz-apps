import { Injectable } from "@angular/core";
import { NpnServiceUtils } from "../common";
import { Observable, from } from "rxjs";
import { map } from 'rxjs/operators';
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

@Injectable()
export class BoundaryService {
    constructor(private serviceUtils:NpnServiceUtils){}

    getBoundaryTypes():Observable<BoundaryType[]> {
        return from(
            this.serviceUtils.cachedGet(this.serviceUtils.dataApiUrl2(`${BOUNDARY_API_ROOT}/types`))
        );
    }

    getBoundaries(typeId:number):Observable<Boundary[]> {
        return this.serviceUtils.http.get<Boundary []>(
            this.serviceUtils.dataApiUrl2(`${BOUNDARY_API_ROOT}`),
            {params:{type_id:`"${typeId}"`}}
        ).pipe(
            map(boundaries => (boundaries||[]).sort((a,b) => a.name.localeCompare(b.name)))
        );
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