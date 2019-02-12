import { Component, Input, ElementRef, ViewChild } from '@angular/core';
import { ObservableMedia } from "@angular/flex-layout";

import { MapVisualizationBaseComponent } from '../map-visualization-base.component';
import { MapSelection } from './map-selection';
import { MapLayerLegendComponent } from '@npn/common/gridded/map-layer-legend.component';
import { MouseEvent } from '@agm/core';
import { GriddedPointData } from '@npn/common/gridded';

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

    constructor(protected rootElement: ElementRef, protected media: ObservableMedia) {
        super(rootElement,media);
    }

    mapReady(map: google.maps.Map): void {
        /*map.addListener('resize', () => {
            console.log('resize happened');
            console.log('panning to center');
        });*/
        map.setCenter(new google.maps.LatLng(this.latitude, this.longitude));
        map.setZoom(this.zoom);
        this.getMapResolver(map);
    }

    // TODO over-ride most inherited functionality (or don't inherit it)
    protected resize():void {
        // parent forces width/height to align with other visualization aspect ratio.
        this.getMap().then(map => google.maps.event.trigger(map, 'resize'));
        if(this.legend) {
            this.legend.redraw();
        }
    }

    protected redraw():void {
        this.getMap().then(map => this.selection.visualize(map).then(() => {
            if(this.legend) {
                this.legend.redraw();
            }
        }));
    }

    protected update():void {
        this.redraw();
    }

    mapClick($event:MouseEvent) {
        const {lat,lng} = $event.coords;
        console.log(`mapClick lat=${lat} lng=${lng}`)
        if(this.selection.activeLayer  && this.selection.legend) {
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