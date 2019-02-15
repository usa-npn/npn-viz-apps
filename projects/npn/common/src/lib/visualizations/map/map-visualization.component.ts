import { Component, Input, ElementRef, ViewChild } from '@angular/core';
import { ObservableMedia } from "@angular/flex-layout";

import { MapVisualizationBaseComponent } from '../map-visualization-base.component';
import { MapSelection } from './map-selection';
import { MapLayerLegendComponent } from '@npn/common/gridded/map-layer-legend.component';
import { MouseEvent } from '@agm/core';
import { GriddedPointData, MapLayerLegend } from '@npn/common/gridded';
import { Species, Phenophase } from '@npn/common/common';

@Component({
    selector: 'map-visualization',
    template: `
    <div class="vis-container">
        <div class="vis-working" *ngIf="selection.working">
            <npn-logo spin="false"></npn-logo>
        </div>
        <div class="map-wrapper">
            <agm-map (mapReady)="mapReady($event)" 
                [streetViewControl]="false"  [styles]="mapStyles" [scrollwheel]="false"
                (mapClick)="mapClick($event)">
                <agm-info-window *ngIf="griddedData"
                    [isOpen]="griddedOpen"
                    (infoWindowClose)="griddedOpen = false"
                    [latitude]="griddedLat" [longitude]="griddedLng">
                    <div class="gridded-info">
                        <div class="legend-swatch" [ngStyle]="{'background-color': griddedData.legendData?.color}">&nbsp;</div>
                        <div class="point-formatted">{{griddedData.formatted}}</div>
                    </div>
                </agm-info-window>
                <agm-marker *ngFor="let m of markers"
                    [latitude]="m.latitude" [longitude]="m.longitude"
                    [iconUrl]="m.icon"
                    [title]="m.title"></agm-marker>
            </agm-map>
            <map-layer-legend *ngIf="!thumbnail && selection.legend" [legend]="selection.legend"></map-layer-legend>
        </div>
    </div>
    `,
    styleUrls: ['./map-visualization.component.scss']
})
export class MapVisualizationComponent extends MapVisualizationBaseComponent {
    @Input() selection:MapSelection;
    @ViewChild(MapLayerLegendComponent) legend:MapLayerLegendComponent;

    griddedLat:number;
    griddedLng:number;
    griddedOpen:boolean = false;
    griddedData:GriddedPointData;

    markers:MapVisMarker[];

    constructor(protected rootElement: ElementRef, protected media: ObservableMedia) {
        super(rootElement,media);
    }

    mapReady(map: google.maps.Map): void {
        map.setCenter(new google.maps.LatLng(this.latitude, this.longitude));
        map.setZoom(this.zoom);
        this.getMapResolver(map);
    }

    protected resize():void {
        console.log('MapVisualization.resize');
        if(this.legend) {
            this.legend.redraw();
        }
    }

    /**
     * redraws are triggered by layer related changes.
     */
    protected redraw():void {
        console.log('MapVisualization.redraw');
        this.getMap().then(map => this.selection.updateLayer(map).then(() => {
            if(this.legend) {
                this.legend.redraw();
            }
            this.updateMarkers();
        }));
    }

    private lastUpdateLegend:MapLayerLegend;
    private updateMarkers() {
        const {legend} = this.selection;
        if(!legend || legend !== this.lastUpdateLegend) {
            this.lastUpdateLegend = legend;
            this.markers = (this.markers||[]).map(m => {
                m = m.clone();
                const data = legend
                    ? legend.getPointData(m.doy)
                    : null;
                m.icon.fillColor = data ? data.color : '#ffffff';
                m.title = legend
                    ? m.records.map(r => legend.formatPointData(r.mean_first_yes_doy)).join(', ')
                    : m.records.map(r => r.mean_first_yes_doy).join(', ');
                return m;
            });
        }
    }

    /**
     * updates are triggered by data related changes and will be called by the application
     * when setting up the visualization the first time.
     */
    protected update():void {
        console.log('MapVisualization.update');
        this.markers = [];
        this.getMap().then(() => { // just to make sure the google apis are loaded
            this.selection.getData().then((data:MapVisRecord[]) => {
                console.log(`MapVisualization: data.length=${data.length} (from server, unfiltered)`);
                if(!data.length) {
                    return;
                }
                data = data
                    .filter(d => d.mean_first_yes_doy !== -9999) // throw out invalid means
                    .sort((a,b) => a.mean_first_yes_doy - b.mean_first_yes_doy); // sort ascending by doy
                const speciesIds = this.selection.validPlots.map(p => `${p.species.species_id}`);
                console.log(`MapVisualization: data.length=${data.length}`,data);
                const bySiteMap:BySiteMap = {};
                this.markers = data.reduce((arr,d) => {
                        if(bySiteMap[d.site_id]) {
                            bySiteMap[d.site_id].addRecord(d);
                        } else {
                            const m = new MapVisMarker(d,newGoogleMapsSymbol(MAP_VIS_SVG_PATHS[speciesIds.indexOf(`${d.species_id}`)]));
                            arr.push(m);
                            bySiteMap[d.site_id] = m;
                        }
                        return arr;
                    },[]);
                this.redraw();
                console.log(`MapVisualization.markers (${this.markers.length})`,this.markers);
            });
        });
    }

    mapClick($event:MouseEvent) {
        const {lat,lng} = $event.coords;
        if(this.selection.layer  && this.selection.legend) {
            this.selection.legend.getGriddedPointData(new google.maps.LatLng(lat,lng))
                .subscribe(data => {
                    if(data) {
                        this.griddedLat = lat;
                        this.griddedLng = lng;
                        this.griddedData = data;
                        this.griddedOpen = true;
                    }
                });
        }
    }
}

export const MAP_VIS_SVG_PATHS:string[] = [
    'M0 22 L22 22 L10 0 Z', // triangle
    'M0 22 L22 22 L22 0 L0 0 Z', // square
    'M4 22 L18 22 L22 10 L18 0 L4 0 L0 10 Z' // hexagon
];

function newGoogleMapsSymbol(path:string):google.maps.Symbol {
    return {
        path,
        anchor: new google.maps.Point(11,11),
        scale: 1,
        fillOpacity: 1,
        fillColor: '#ffffff',
        strokeColor: '#204d74'
    };
}

interface BySiteMap {
    [id:string]:MapVisMarker;
}

interface MapVisRecord extends Species,Phenophase {
    site_id:number;
    mean_first_yes_doy:number;
    phenophase_id:number;
    latitude:number;
    longitude:number;
    // lots of other stuff
}

class MapVisMarker {
    title:string;
    records:MapVisRecord[];

    constructor(public record:MapVisRecord,public icon:google.maps.Symbol) {
        this.records = [record];
    }

    addRecord(record:MapVisRecord) {
        this.records.push(record);
        this.icon.strokeColor = '#00ff00';
    }

    get latitude():number { return this.record.latitude; }
    get longitude():number { return this.record.longitude; }

    get site_id():number { return this.record.site_id; }
    get doy():number { return this.record.mean_first_yes_doy; }

    clone():MapVisMarker {
        const clone = new MapVisMarker(this.record,this.icon);
        clone.records = this.records.slice();
        return clone;
    }
}