import { Component, Input, SimpleChanges, NgZone } from '@angular/core';
import { AgddTimeSeriesSelection } from './agdd-time-series-selection';
import { MonitorsDestroy } from '@npn/common/common';
import { takeUntil, startWith } from 'rxjs/operators';
import { MapLayer } from '@npn/common/gridded';

@Component({
    selector: 'agdd-ts-map-layer-control',
    template: `
    <div *ngIf="selection.layer" class="layer-controls">
        <extent-control [selection]="selection"></extent-control>
        <supports-opacity-control [supportsOpacity]="selection.layer"></supports-opacity-control>
        <p *ngIf="selection.layer.hasAbstract()" [innerHTML]="selection.layer.getAbstract()"></p>
    </div>
    `,
    styles:[`
    :host {
        display: block;
    }
    mat-form-field.layer-category {
        display: block;
    }
    .layer-controls {
        width: 400px;
    }
    .layer-controls >p {
        margin: 12px 0px 0px 0px;
    }
    `]
})
export class AgddTsMapLayerControl extends MonitorsDestroy {
    @Input() selection: AgddTimeSeriesSelection;
    @Input() map;/*:google.maps.Map;*/

    marker;
    layer:MapLayer;
    
    private mapResolver;
    private getMap = new Promise<google.maps.Map>(resolve => this.mapResolver = resolve);

    constructor(private zone:NgZone){
        super();
    }

    ngOnInit() {
        const {selection,componentDestroyed} = this;
        // would be nice to just watch the selection but updates only come through if a selection is valid
        componentDestroyed.subscribe(() => selection.endMonitorLayerChange());
        selection.monitorLayerChange().pipe(
            startWith(selection.layerName),
            takeUntil(componentDestroyed)
        ).subscribe(layerName => {
            console.log(`AgddTsMapLayerControl.layerName=${layerName}`);
            if(this.layer && this.layer.layerName !== layerName) {
                this.layer.off();
                this.layer = undefined;
            }
            if(layerName && !this.layer) {
                Promise.all([
                    this.getMap,
                    selection.getLayer()
                ]).then(results => {
                    const [map,layer] = results;
                    layer.setMap(map);
                    layer.on();
                    this.layer = layer;
                });
            }
        });

        this.getMap.then(map => {
            const updateLatLng = event => {
                console.log(`AgddTsMapLayerControl.updateLatLng`,event);
                this.zone.run(() => {
                    selection.latLng = [
                        event.latLng.lat(),
                        event.latLng.lng()
                    ]
                });
            };
            if(selection.latLng && selection.latLng.length === 2) {
                const {latLng} = selection;
                this.marker = new google.maps.Marker({
                    map,
                    draggable:true,
                    position: new google.maps.LatLng(latLng[0],latLng[1])
                });
                this.marker.addListener('dragend',updateLatLng);
            } else {
                // have them drop a marker
                map.addListener('click',event => {
                    this.marker = new google.maps.Marker({
                        map,
                        draggable:true,
                        position: event.latLng
                    });
                    updateLatLng(event);
                    this.marker.addListener('dragend',updateLatLng);
                });
            }
        });
    }

    ngOnChanges(changes:SimpleChanges) {
        if(changes && changes.map && changes.map.currentValue) {
            this.mapResolver(changes.map.currentValue);
        }
    }
}