import { Component, Input, ElementRef, ViewChild } from '@angular/core';
import { ObservableMedia } from "@angular/flex-layout";

import { MapVisualizationBaseComponent } from '../map-visualization-base.component';
import { MapSelection } from './map-selection';
import { MapLayerLegend } from '@npn/common/gridded';
import { MapLayerLegendComponent } from '@npn/common/gridded/map-layer-legend.component';

@Component({
    selector: 'map-visualization',
    template: `
    <div class="vis-container">
        <div class="vis-working" *ngIf="selection.working">
            <npn-logo spin="false"></npn-logo>
        </div>
        <div class="map-wrapper">
            <agm-map (mapReady)="mapReady($event)"  [streetViewControl]="false"  [styles]="mapStyles" [scrollwheel]="false"></agm-map>
            <map-layer-legend *ngIf="!thumbnail && selection.legend" [legend]="selection.legend"></map-layer-legend>
        </div>
    </div>
    `,
    styleUrls: ['./map-visualization.component.scss']
})
export class MapVisualizationComponent extends MapVisualizationBaseComponent {
    @Input() selection:MapSelection;
    @ViewChild(MapLayerLegendComponent) legend:MapLayerLegendComponent;

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
}