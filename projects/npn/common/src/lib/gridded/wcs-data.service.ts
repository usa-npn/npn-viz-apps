import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpParams } from '@angular/common/http';

import * as $jq_ from 'jquery';
const $jq = $jq_;

import { NpnMapLegend } from './wms-map-legend';
import { NpnServiceUtils } from '../common/index';

const TO_RADIANS = (degrees:number) => degrees * Math.PI / 180;
const TO_DEGREES = (radians:number) => radians * 180 / Math.PI;
export const DESTINATION_POINT = (latLng:google.maps.LatLng,brng:number,dist:number):google.maps.LatLng => {
    // 0=N,90=E,180=S,270=W dist in km
    dist = dist / 6371;
    brng = TO_RADIANS(brng);

    let lat1 = TO_RADIANS(latLng.lat()),
        lon1 = TO_RADIANS(latLng.lng());

    let lat2 = Math.asin(Math.sin(lat1) * Math.cos(dist) +
                         Math.cos(lat1) * Math.sin(dist) * Math.cos(brng));

    let lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(dist) *
                                 Math.cos(lat1),
                                 Math.cos(dist) - Math.sin(lat1) *
                                 Math.sin(lat2));

    if (isNaN(lat2) || isNaN(lon2)) {
         return null;
     }

    return new google.maps.LatLng(TO_DEGREES(lat2),TO_DEGREES(lon2));
}

@Injectable()
export class WcsDataService {
    constructor(private serviceUtils:NpnServiceUtils) {}

    newInfoWindowHandler(map:google.maps.Map) {
        return new GriddedInfoWindowHandler(this,map);
    }

    // NOTE: the original from the npn-vis-tool passed in a layer object and augmented
    // WCS parameters based on its extent.  At the moment full layers are not in use
    // and don't exist for the set of current components.  All usage at the moment
    // ties back to the ClippedWmsMapSelection class so look there when the time comes
    getGriddedData(layerName:string,
                   latLng:google.maps.LatLng,
                   gridSize:number,
                   paramsAugment?:(args:any) => void):Observable<number[]> {
        const edges = [0,80,180,270].map(bearing => DESTINATION_POINT(latLng,bearing,(gridSize/2)));
        const wcsArgs = {
                service: 'WCS',
                request: 'GetCoverage',
                version: '2.0.1',
                coverageId: layerName.replace(':','__'), // convention
                format: 'application/gml+xml',
                subset: []
            };
        // add edges
        wcsArgs.subset.push('http://www.opengis.net/def/axis/OGC/0/Long('+[edges[3].lng(),edges[1].lng()].join(',')+')');
        wcsArgs.subset.push('http://www.opengis.net/def/axis/OGC/0/Lat('+[edges[2].lat(),edges[0].lat()].join(',')+')');
        // date extent example...
        // http://www.opengis.net/def/axis/OGC/0/time("2018-01-31T00:00:00.000Z")
        if(paramsAugment) {
            paramsAugment(wcsArgs);
        }
        console.log('wcsArgs',wcsArgs);
        /*
        TODO re-test issue post Angular 6
        // see: https://github.com/angular/angular/issues/11058
        // will need to change when upgrading Angular version and moving to HttpClient
        let urlParams:URLSearchParams = new URLSearchParams('',new GhQueryEncoder());
        */
        let params = new HttpParams();
        Object.keys(wcsArgs).filter(key => key !== 'subset').forEach(key => params = params.set(key,wcsArgs[key]));
        wcsArgs.subset.forEach(v => params = params.append('subset',v));
        return this.serviceUtils.http.get<string>(`${this.serviceUtils.config.geoServerRoot}/wcs`,{params:params})
            .pipe(
                map(response => {
                    let wcsData = $jq($jq.parseXML(response)),
                        tuples = wcsData.find('tupleList').text();
                    return tuples ?
                        tuples.trim().split(' ').map(t => parseFloat(t)) :
                        [];
                })
            )
    }
}

/*
class GhQueryEncoder extends QueryEncoder {
    encodeKey(k: string): string {
        k = super.encodeKey(k);
        return k.replace(/\+/gi, '%2B');
    }
    encodeValue(v: string): string {
        v = super.encodeKey(v);
        return v.replace(/\+/gi, '%2B');
    }
}
*/

export class GriddedInfoWindowHandler {
    infoWindow:google.maps.InfoWindow;
    constructor(private dataService:WcsDataService,private map:google.maps.Map) {}

    open(latLng:google.maps.LatLng,layerName:string,legend:NpnMapLegend,paramsAugment?:(args:any) => void) {
        this.dataService.getGriddedData(layerName,latLng,5,paramsAugment)
            .subscribe((tuples:number[]) => {
                console.log('GriddedInfoWindowHandler.tuples',tuples);
                let point = tuples && tuples.length ? tuples[0] : undefined;
                if(point === -9999 || isNaN(point)) {
                    console.log(`GriddedInfoWindowHandler: received -9999 or Nan (${point}) ignoring`);
                    return;
                }
                let html = `<div id="griddedPointInfoWindow">`;
                let legendPoint = legend.getPointData(point);
                if(legendPoint) {
                    html += `<div class="gridded-legend-color" style="background-color: ${legendPoint.color};">&nbsp;</div>`;
                }
                html += `<div class="gridded-point-data">${legend.formatPointData(point)}</div>`;
                html += `</div>`;
                if(!this.infoWindow) {
                    this.infoWindow = new google.maps.InfoWindow({
                        maxWidth: 200,
                        content: 'contents'
                    });
                }
                this.infoWindow.setContent(html);
                this.infoWindow.setPosition(latLng);
                this.infoWindow.open(this.map);
            });
    }

    close() {
        if(this.infoWindow) {
            this.infoWindow.close();
        }
    }
}
