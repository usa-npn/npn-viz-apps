import { Component, Input, ElementRef, ViewChild } from '@angular/core';
import { ObservableMedia } from "@angular/flex-layout";

import { MapVisualizationBaseComponent } from '../map-visualization-base.component';
import { MapSelection } from './map-selection';
import { MapLayerLegendComponent } from '@npn/common/gridded/map-layer-legend.component';
import { MouseEvent } from '@agm/core';
import { GriddedPointData, MapLayerLegend } from '@npn/common/gridded';
import { Species, Phenophase } from '@npn/common/common';
import { SiteOrSummaryPlotData } from '../site-or-summary-vis-selection';

@Component({
    selector: 'map-visualization',
    template: `
    <div class="vis-container">
        <div class="map-wrapper">
            <npn-logo class="working" *ngIf="selection.working" spin="true"></npn-logo>
            <agm-map (mapReady)="mapReady($event)" 
                [streetViewControl]="false"  [styles]="mapStyles" [scrollwheel]="false"
                (mapClick)="mapClick($event)">
                <agm-info-window *ngIf="griddedData || griddedLoading"
                    [isOpen]="griddedOpen"
                    (infoWindowClose)="griddedOpen = false"
                    [latitude]="griddedLat" [longitude]="griddedLng">
                    <div *ngIf="griddedData || griddedLoading" class="gridded-info">
                        <div *ngIf="griddedLoading" class="spinner-logo">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 391 391"><g>
                            <path class="swirl-top" d="M182,1c-36.3,2.4-68.6,13.4-95.3,32.5c-5.6,4-11.8,8.7-13.7,10.4l-3.5,3L73,46c5.8-1.6,15.6-1.2,22.2,1.1
                                    c9.4,3.1,19.3,10.1,30.3,21.3C137.1,80.2,145.6,91,168,122c17.1,23.8,26.5,34.3,39.5,44.2c16.2,12.4,28.9,16.3,49.5,15.5
                                    c21.7-0.9,38.4-7.7,53.2-21.6c17.4-16.3,25.7-36.1,25.8-61c0-10.3,0-10.3-2.2-9.6c-21.5,6.6-48.9,3.2-72.9-9.1
                                    c-27.3-14.1-51.2-45.7-48.4-64.1c0.7-5.1,6-11,10.6-12c5.3-1,3-2.1-5.8-2.7C199.9,0.4,193.3,0.3,182,1z"/>
                            <path class="swirl-top" d="M256.5,5.9c-8.8,0.9-11.6,1.9-13.9,5.3c-2.2,3.1-2,6.5,0.8,12.5c6.1,13.1,19.8,28.5,30.3,34
                                    c11,5.9,28.3,8.6,41.2,6.4l6.5-1.1l8.2,4.5c4.5,2.5,8.7,4.5,9.3,4.5c2.5,0,0.8-4.1-3.6-9l-4.6-5.2l-0.1-10.2
                                    c-0.1-9.3-0.4-10.7-3.3-16.7c-5.4-10.8-16-19.1-30-23.2C291.1,5.8,267.9,4.8,256.5,5.9z M315.8,40.2c2.7,2.7,0.7,7.8-2.9,7.8
                                    c-2.1,0-4.9-2.6-4.9-4.5C308,40,313.3,37.7,315.8,40.2z"/>
                            <path class="swirl-top" d="M72.5,50.6c-9.9,2.3-10.4,2.6-18.8,11.3c-4.5,4.7-11.1,12.2-14.6,16.6c-9.7,12.3-26,37.8-23,35.9
                                    c0.8-0.5,4.6-3,8.6-5.7c9.7-6.4,23.9-13.1,34.8-16.3c8-2.5,10.6-2.7,24-2.7s15.9,0.2,23.8,2.6c4.8,1.5,12.4,4.5,16.9,6.8l8.1,4.1
                                    l-3.8-6.9c-11.6-20.8-25.7-37.2-36.6-42.2C85.7,51.2,76.8,49.6,72.5,50.6z"/>
                            <path class="swirl-left" d="M354.6,81.9c1.3,5,0.7,31.5-1,40.5c-4.6,24.2-16.5,43.5-35.4,57.4c-14.1,10.4-23.8,14.3-55.1,22.2
                                    c-23.8,6-32.9,8.9-44.6,14.5c-22.7,10.9-35.8,23.3-45,42.6c-5.4,11.5-7.5,21.2-7.5,35.1c0,15.5,1.9,23.6,8.5,37.4
                                    c10.3,21.3,27.7,35.9,51.2,43c7.6,2.4,10.6,2.7,22.3,2.8c15.3,0,23.2-1.5,34.5-6.7c19-8.6,31.2-17.5,48-34.8
                                    c17.5-18,28.4-33.6,39.6-56.3c28.1-57.2,26.1-119.5-5.7-181.6C358.2,85.8,353.6,78.3,354.6,81.9z M329.4,194.2
                                    c-30.6,42.4-63.6,80-84.9,96.8c-13.1,10.3-34,19-49.9,20.6l-6.4,0.7l-0.7-7.7c-1.4-14.8,2.6-33.4,9.7-45.3
                                    c5-8.5,14.6-17.5,23.6-22.1c8.9-4.7,17.5-7.3,43.7-13.7c10.5-2.6,23.5-6.4,29.1-8.6c10.9-4.2,24.4-12.7,33.4-20.8
                                    c3-2.8,5.7-5.1,5.8-5.1C333,189,331.5,191.4,329.4,194.2z"/>
                            <path class="swirl-right" d="M67.5,108c-17.8,3.8-37.3,16-48,30.2C8.7,152.5,3.6,167,2,187.1C-0.1,215,7.8,248,24.4,280.3
                                    c34.1,66.3,95.1,104.5,174.1,109.1l9,0.5l-6.5-1.4c-56.1-12.9-106.1-51.7-136.8-106.2c-14.5-25.7-20.6-47.5-20.7-73.8
                                    c0-23.4,4.2-40,14.8-57.7c4.2-6.9,12.6-17.3,13.4-16.5c0.2,0.3-1.6,4.5-4,9.3C58.6,161.8,55,177.6,55,199c0,37.8,14.2,78,39.4,111.7
                                    c14.5,19.5,39,42.1,58.8,54.2c14.9,9,31.2,16.2,46.5,20.5c14.6,4,15.2,3.9,5.5-1.4c-45.2-24.2-65.1-62.5-55.7-107.3
                                    c0.9-4.3,3.9-15.1,6.6-24c9.7-31.5,12.1-43.7,12-63c0-9.1-0.5-14.3-2.1-20.2C154.6,125.4,111.9,98.7,67.5,108z"/>
                        </g></svg>
                        </div>
                        <div *ngIf="!griddedLoading" class="legend-swatch" [ngStyle]="{'background-color': griddedData.legendData?.color}">&nbsp;</div>
                        <div class="point-formatted">{{griddedLoading ? 'Loading...' : griddedData.formatted}}</div>
                    </div>
                </agm-info-window>
                <agm-marker *ngFor="let m of markers"
                    [latitude]="m.latitude" [longitude]="m.longitude"
                    [iconUrl]="m.icon"
                    [title]="m.title" (markerClick)="selectedMarker = m"></agm-marker>
                <agm-info-window
                    [isOpen]="!!selectedMarker" (infoWindowClose)="selectedMarker = null"
                    [latitude]="selectedMarker?.latitude" [longitude]="selectedMarker?.longitude">
                    <map-visualization-marker-iw [marker]="selectedMarker" [selection]="selection"></map-visualization-marker-iw>
                </agm-info-window>
            </agm-map>
            <map-layer-legend *ngIf="!thumbnail && selection.legend" [legend]="selection.legend"></map-layer-legend>
            <img src = 'assets/USA-NPN-logo-RGB2019.png' class='npnlogo'/>
            <img src = 'assets/University-of-Arizona-Logo.png' class='ualogo'/>
            <img src = 'assets/usgs-logo.png' class='usgslogo'/>
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
    griddedLoading:boolean = false;

    markers:MapVisMarker[];
    selectedMarker:MapVisMarker;

    constructor(protected rootElement: ElementRef, protected media: ObservableMedia) {
        super(rootElement,media);
    }

    mapReady(map: google.maps.Map): void {
        map.setCenter(new google.maps.LatLng(this.latitude, this.longitude));
        map.setZoom(this.zoom);
        this.getMapResolver(map);
    }

    /**
     * triggered by window re-sizes and other UI logic when available screen
     * real-estate may have changed.
     */
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
        if(this.selection.layerName == "precipitation:buffelgrass_prism") {
            this.zoom = 6;
            this.latitude = 33.4;
            this.longitude = -112;
        }
        else if(this.selection.layerName != null && this.selection.layerName.includes("alaska")) {
            this.zoom = 4;
            this.latitude = 62;
            this.longitude = -152;
        }
        else {
            this.zoom = 4;
            this.latitude = 38.8402805;
            this.longitude = -97.61142369999999;
        }
        console.log('MapVisualization.redraw');
        this.getMap().then(map => this.selection.updateLayer(map).then(() => {
            map.setCenter(new google.maps.LatLng(this.latitude, this.longitude));
            map.setZoom(this.zoom);
            if(this.legend) {
                this.legend.redraw();
            }
            this.updateMarkers();
        }));
    }

    private lastUpdateLegend:MapLayerLegend;
    /**
     * If the underlying legend coloring markers has changed since the last update
     * then re-create all markers with new colors.  Markers have to be recreated
     * since the underlying angular library won't update them if their references
     * do not change (does not logically deep watch the contents of each marker).
     */
    private updateMarkers() {
        const {legend} = this.selection;
        if(
           (!legend || legend !== this.lastUpdateLegend) || // if the legend changed
           (this.markers.length && !this.markers[0].cloned) // OR the markers are "new" (!cloned) so haven't been colored
           ) {
            this.lastUpdateLegend = legend;
            this.markers = (this.markers||[]).map(m => {
                m = m.clone();
                const data = legend
                    ? legend.getPointData(m.doy)
                    : null;
                if(legend.layerName.includes('si-x') || legend.layerName.includes('no-layer')) {
                    m.icon.fillColor = data ? data.color : '#ffffff';
                } else {
                    m.icon.fillColor = '#ffffff';
                }
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
            this.selection.getData().then((allPlotData:SiteOrSummaryPlotData[]) => {
                const data = allPlotData.reduce((records,plotData,plotIndex) => {
                        const filtered = plotData.data
                            .filter(d => d.mean_first_yes_doy !== -9999) // throw out invalid means
                            .map(d => {
                                d.plot = plotData.plot;
                                d.plotIndex = plotIndex;
                                return d;
                            });
                        return records.concat(filtered);
                    },[])
                    .sort((a,b) => a.mean_first_yes_doy - b.mean_first_yes_doy); // sort ascending by doy
                console.log(`MapVisualization: data.length=${data.length} (filtered)`);
                const bySiteMap:BySiteMap = {}; // to consolidate multiple species/phenos at a given station/marker
                    this.markers = data.reduce((arr,d) => {
                            if(bySiteMap[d.site_id]) {
                                bySiteMap[d.site_id].addRecord(d);
                            } else {
                                const m = new MapVisMarker(d,newGoogleMapsSymbol(MAP_VIS_SVG_PATHS[d.plotIndex]));
                                arr.push(m);
                                bySiteMap[d.site_id] = m;
                            }
                            return arr;
                        },[]);
                console.log(`MapVisualization: markers.length=${this.markers.length}`);
                this.redraw();
            });
        });
    }

    mapClick($event:MouseEvent) {
        const {lat,lng} = $event.coords;
        this.griddedLoading = true;
        this.griddedLat = lat;
        this.griddedLng = lng;
        this.griddedData = null;
        this.griddedOpen = true;
        if(this.selection.layer  && this.selection.legend) {
            this.selection.legend.getGriddedPointData(new google.maps.LatLng(lat,lng))
                .subscribe(data => {
                    if(data) {
                        this.griddedLoading = false;
                        this.griddedLat = lat;
                        this.griddedLng = lng;
                        this.griddedData = data;
                        this.griddedOpen = true;
                    }
                });
        }
    }

    markerClick(marker:MapVisMarker) {
        console.log('MapVisualization.markerClick',marker);
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

export class MapVisMarker {
    title:string;
    records:MapVisRecord[];

    constructor(public record:MapVisRecord,public icon:google.maps.Symbol,public cloned?:boolean) {
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
        const clone = new MapVisMarker(this.record,this.icon,true);
        clone.records = this.records.slice();
        return clone;
    }
}