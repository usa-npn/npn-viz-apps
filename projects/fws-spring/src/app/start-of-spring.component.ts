import { Component, NgZone } from '@angular/core';

import { MapsAPILoader } from '@agm/core';

import { MapBase } from './map-base';
import { Refuge } from './refuge.service';
import { NpnServiceUtils,DESTINATION_POINT } from '@npn/common';

import * as d3 from 'd3';
import { MatDialog } from '@angular/material';
import { StartOfSpringDialog } from './start-of-spring-dialog.component';
import { FLYWAY_COLORS } from './flyways';
import { MARKER_COLORS, MARKER_ICONS, FLI_PCNT_BUCKET_INDEX, FLI_DESCRIPTIONS } from './fli-pcnt';

function polyContains(point,poly) {
    return google.maps.geometry.poly.containsLocation(point,poly) || google.maps.geometry.poly.isLocationOnEdge(point,poly);
}
function geoContains(point,geo) {
    const polyType = geo.getType();
    let poly,arr,i;
    if(polyType == 'Polygon') {
        arr = geo.getArray();
        const outerRing = new google.maps.Polygon({paths: arr[0].getArray()});
        if(polyContains(point,outerRing)) {
            /* for the purposes of this application being anywhere inside the
               outer ring means you're in the flyway
               the polygons may have holes for things like the great lakes..
            // inside the outer ring
            for(i = 1; i < arr.length; i++) {
                const innerRing = new google.maps.Polygon({paths: arr[i].getArray()});
                if(polyContains(point,innerRing)) {
                    // inside a hole in the outer ring so not in the polygon
                    return false;
                }
            }*/
            return true;
        }
        return false;
    } else if (polyType === 'MultiPolygon' || polyType == 'GeometryCollection') {
        arr = geo.getArray();
        for(i = 0; i < arr.length; i++) {
            if(geoContains(point,arr[i])) {
                return true;
            }
        }
    }
    return false;
}

const DIALOG_CONFIG = {
    width: '90vw',
    maxWidth: '90vw'
};

@Component({
    selector: 'start-of-spring',
    template: `
    <form class="control-form">
        <refuge-control (onList)="refugesReady($event)" (onSelect)="selectRefuge($event)"></refuge-control>
        <button *ngIf="selected" class="reset-button"
            mat-icon-button (click)="reset()" matTooltip="Reset map"><i class="fa fa-refresh" aria-hidden="true"></i></button>
    </form>
    <div class="map-wrapper">
        <div class="vis-working" *ngIf="working">
            <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        </div>
        <agm-map (mapReady)="mapReady($event)"
                [latitude]="latitude" [longitude]="longitude" [zoom]="zoom"
                [streetViewControl]="false" [scrollwheel]="false" [styles]="mapStyles">
            <agm-marker *ngFor="let refuge of refuges"
                (markerClick)="selectRefuge(refuge)"
                [iconUrl]="refuge.icon"
                [title]="refuge.title"
                [latitude]="refuge.location.lat" [longitude]="refuge.location.lng"></agm-marker>
        </agm-map>
        <ul class="start-of-spring-legend">
            <li class="title">How does the timing of recent spring compare to the last 100 years?</li>
            <li class="mean-5">&lt; 5% ({{FLI_DESCRIPTIONS[0]}})</li>
            <li class="mean-5-25">5 - 25% ({{FLI_DESCRIPTIONS[1]}})</li>
            <li class="mean-25-75">25 - 75% ({{FLI_DESCRIPTIONS[2]}})</li>
            <li class="mean-75-95">75 - 95% ({{FLI_DESCRIPTIONS[3]}})</li>
            <li class="mean-95">&gt; 95% ({{FLI_DESCRIPTIONS[4]}})</li>
            <li class="no-data">No data</li>
        </ul>
    </div>
    `,
    styleUrls:['./start-of-spring.component.scss']
})
export class StartOfSpringComponent extends MapBase {
    FLI_DESCRIPTIONS = FLI_DESCRIPTIONS;
    refuges:Refuge[] = [];
    selected:Refuge;
    working = false;

    flywayTesters = [];
    constructor(public npnSvcUtils:NpnServiceUtils,
                private dialog:MatDialog,
                private zone:NgZone) {
        super();
    }

    private findFlywayId(refuge:Refuge):string {
        let flywayId = this.flywayTesters.reduce((flywayId,tester) => {
            if(!flywayId) {
                flywayId = tester(refuge.point);
            }
            return flywayId;
        },null);// using null so subsequent clicks don't re-test
        if(!flywayId) {
            // create a polygon
            const distToCornersKmToTest = [
                25,
                50,
                75
            ];
            const bearingsToTest = [
                270, // W
                315, // NW
                0, // N
                45, // NE
                90, // E
                135, // SE
                180, // S
                225, // SW
                270, // W
            ];
            flywayId = distToCornersKmToTest.reduce((flywayId,distToCornersKm)=> {
                if(!flywayId) {
                    flywayId = bearingsToTest.reduce((flywayId,bearing) => {
                        if(flywayId) {
                            return flywayId;
                        }
                        const p = DESTINATION_POINT(refuge.point,bearing,distToCornersKm);
                        return this.flywayTesters.reduce((fid,tester) => {
                            if(!fid) {
                                fid = tester(p);
                            }
                            return fid;
                        },null);
                    },null);
                    /* draw polygon on the map to show this miss
                    if(!flywayId) {
                        const intersects = new google.maps.Polygon({
                            paths: bearingsToTest.map(bearing => DESTINATION_POINT(refuge.point,bearing,distToCornersKm)),
                            strokeColor: 'red',
                            fillColor: 'blue',
                            strokeWeight: 1,
                            fillOpacity: 0.0
                        })
                        this.getMap.then(map => intersects.setMap(map))
                    }*/
                }
                return flywayId;
            },null);
            
        }
        return flywayId;
    }

    reset() {
        delete this.selected;
        this.getMap.then((map:google.maps.Map) => {
            map.setCenter(new google.maps.LatLng(this.latitude,this.longitude));
            map.setZoom(this.zoom);
        });
    }

    refugesReady(refuges:Refuge[]) {
        this.getMap.then(map => {
            this.npnSvcUtils.cachedGet(this.npnSvcUtils.geoServerUrl('/gdd/ows'),{
                    service: 'WFS',
                    version: '1.0.0',
                    request: 'GetFeature',
                    typeName: 'gdd:waterfowl_flyways',
                    maxFeatures: 50,
                    outputFormat: 'application/json'
                })
                .then(geoJson => {
                    map.data.addGeoJson(geoJson);
                    map.data.setStyle(function(feature) {
                        return {
                            strokeOpacity: 0,
                            strokeWeight: 0,
                            strokeColor: 'transparent',
                            fillOpacity: 0.10,
                            fillColor: FLYWAY_COLORS[feature.getId()]||'#ff0000',
                            clickable: false
                        };
                    });
                    const self = this;
                    map.data.forEach(function(feature) {
                        const id = feature.getId();
                        const flywayGeometry = feature.getGeometry();
                        self.flywayTesters.push(function(point) {
                            return geoContains(point,flywayGeometry) ? id : null;
                        });
                    });
                    // go get the data
                    let nanData = null; 
                    // the csv function is not part of the 4x d3 typings.    
                    (d3 as any).csv('/sites/fws/modules/custom/fws_dashboard/data/start_of_spring_across_moving_windows.csv',(csvData) => {
                        const dataByRefuge = csvData.reduce((map,row) => {
                            Object.keys(row).forEach(key => {
                                if(key && key !== 'NWR') {
                                    row[key] = parseFloat(row[key]);
                                }
                            });
                            // the "NWR" column contains the refuge boundary id
                            // in other CSV is '' column
                            map[row['NWR'].trim()] = row;
                            if(!nanData) {
                                nanData = Object.keys(row).reduce((map,key) => {
                                    map[key] = key === 'NWR' ? null : Number.NaN;
                                    return map;
                                },{});
                            }
                            return map;
                        },{});
                        refuges = refuges.filter(refuge => {
                            if(!refuge.location) {
                                return false;
                            }
                            const refugeKey = refuge.title.toUpperCase();
                            if(!dataByRefuge[refugeKey]) {
                                console.warn(`No data found for ${refugeKey}`)
                                // insert a row containing NaN for all numbers
                                dataByRefuge[refugeKey] = {
                                    ...nanData,
                                    NWR: refugeKey
                                };
                            }
                            return true;
                        });
                        refuges.forEach(refuge => {
                            refuge.data = dataByRefuge[refuge.title.toUpperCase()];
                            refuge.point = new google.maps.LatLng(refuge.location.lat,refuge.location.lng);
                            let markerColorIndex = FLI_PCNT_BUCKET_INDEX(refuge.data['FLI (%)']);
                            /* temporary test code to see for refuges with data which aren't in a flyway boundary
                                * doing this up front is too expensive only make test when the user clicks on a marker
                            if(markerColorIndex !== -1) {
                                // timeout just a hack to give the geometry library time to load
                                setTimeout(() => {
                                    if(!this.findFlywayId(refuge)) {
                                        console.log(`${refuge.title} NOT IN FLYWAY`)
                                    }
                                },5000);
                            }*/
                            /* For this number of icons SVG icons cause a performance isue
                             * presumably because Google maps must re-draw all the SVGs over
                             * and over on zoom/pan
                             * switching to static icons
                            refuge.icon = {
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 5,
                                fillOpacity: 1.0,
                                strokeWeight: 1,
                                fillColor: markerColorIndex !== -1 ? MARKER_COLORS[markerColorIndex] : '#fff'
                            };*/
                            if(markerColorIndex === -1) {
                                markerColorIndex = MARKER_ICONS.length-1;
                            }
                            refuge.icon = `/sites/fws/modules/custom/fws_dashboard/markers/${MARKER_ICONS[markerColorIndex]}`;
                        });
                        this.refuges = refuges;
                    });
                });
        });
    }

    selectRefuge(refuge:Refuge) {
        if(!refuge) {
            return this.reset();
        }
        // show a progress spinner since finding the flyway can be expensive
        // for a rare few refuges (like those in the caribean or florida keys)
        this.working = true;
        setTimeout(() => {
            this.selected = refuge;
            this.getMap.then((map:google.maps.Map) => {
                map.panTo(refuge.point);
                map.setZoom(8);
            });
            if(refuge.flywayId === undefined) {
                refuge.flywayId = this.findFlywayId(refuge);
            }
            const config:any = {
                ...DIALOG_CONFIG,
                data: {
                    refuge,
                    refugeData: refuge.data
                }
            };
            this.working = false;
            this.dialog.open(
                StartOfSpringDialog,
                config
            );
        });
        
    }
}