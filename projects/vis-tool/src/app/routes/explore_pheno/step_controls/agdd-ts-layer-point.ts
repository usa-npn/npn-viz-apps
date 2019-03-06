import { BaseStepComponent, BaseControlComponent, BaseSubControlComponent } from './base';
import { Component } from '@angular/core';
import { StepState, VisConfigStep } from '../interfaces';
import { getLayerTitle } from './map-layer';
import { faMapMarkerAlt } from '@fortawesome/pro-light-svg-icons';

@Component({
    template: `
    <div class="info" *ngIf="visited || complete">
        <div><pre>{{getTitle()}}</pre> {{selection.layer?.extent?.current?.label}}</div>
        <div><label>Location</label>
            <span *ngIf="selection.latLng?.length === 2; else noLocation">{{selection.latLng[0] | number:'1.3-3'}}, {{selection.latLng[1] | number:'1.3-3'}}</span>
            <ng-template #noLocation>NA</ng-template>
        </div>
    </div>`,
    styles: [`
    .info {
        display: flex;
        flex-direction: column;
    }
    .info >div {
        padding-bottom: 5px;
    }
    label {
        font-weight: 600;
    }
    label:after {
        content: ':';
    }
    pre {
        margin: 0px;
        font-family: inherit;
    }
    `]
})
export class AgddTsLayerPointStepComponent extends BaseStepComponent {
    title:string = 'Layer/Point';

    get state():StepState {
        return this.selection.isValid()
            ? StepState.COMPLETE
            : StepState.AVAILABLE;
    }

    getTitle() {
        return getLayerTitle(this.selection.layer);
    }
}

@Component({
    template: `<agdd-ts-map-layer-control [selection]="selection" [map]="map"></agdd-ts-map-layer-control>`
})
export class AgddTsLayerPointControlComponent extends BaseControlComponent {
    title:string = 'Select layer/point';
    defaultPropertyKeys:string[] = ['layerName'];
    subControlComponent:AgddTsLayerPointSubControlComponent;
    map;

    stepVisit():void {
        super.stepVisit();
        console.log(`AgddTsLayerPointControlComponent.stepVisit`);
        // not sure why the delay is necessary
        setTimeout(() => this.subControlComponent.show(),500);
    }
}

@Component({
    template:`
    <div class="map-wrapper">
        <agm-map [streetViewControl]="false" [styles]="mapStyles" [scrollwheel]="false"
        [latitude]="latitude" [longitude]="longitude" [zoom]="zoom"
        (mapReady)="controlComponent.map = $event;"></agm-map>
    </div>
    `,
    styles:[`
    .map-wrapper {
        width: 100%;
        height: 100%;
    }
    `]
})
export class AgddTsLayerPointSubControlComponent extends BaseSubControlComponent {
    title:string = 'Select layer/point';
    $fullScreen:boolean = true;

    latitude: number = 38.8402805;
    longitude: number = -97.61142369999999
    zoom: number = 4;

    mapStyles: any[] = [{
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
    }, {
        featureType: 'transit.station',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
    },
    {
        featureType: 'poi.park',
        stylers: [{ visibility: 'off' }]
    },
    {
        featureType: 'landscape',
        stylers: [{ visibility: 'off' }]
    }];
}

export const AgddTsLayerPointStep:VisConfigStep = {
    icon: faMapMarkerAlt,
    stepComponent: AgddTsLayerPointStepComponent,
    controlComponent: AgddTsLayerPointControlComponent,
    subControlComponent: AgddTsLayerPointSubControlComponent
};

