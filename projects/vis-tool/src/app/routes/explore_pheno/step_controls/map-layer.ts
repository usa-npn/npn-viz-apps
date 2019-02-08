import { BaseStepComponent, BaseControlComponent } from './base';
import { Component } from '@angular/core';
import { StepState, VisConfigStep } from '../interfaces';
import { MapSelection } from '@npn/common';
import { faLayerGroup } from '@fortawesome/pro-light-svg-icons';

function layerTitle(layer) {
    if(layer) {
        const ds = layer.title.indexOf('- ');
        return ds !== -1
            ? layer.title.substring(ds+2)
            : layer.title;
    }
}

@Component({
    template: `<div>{{selection.layer?.getTitle()}}</div><div>{{selection.layer?.extent?.current?.label}}</div>`
})
export class MapLayerStepComponent extends BaseStepComponent {
    title:string = 'Layer';

    get state():StepState {
        return this.visited
            ? StepState.COMPLETE
            : StepState.AVAILABLE;
    }

    layerTitle(layer) {
        return layerTitle(layer);
    }
}

@Component({
    template: `<consolidated-map-layer-control [selection]="selection"></consolidated-map-layer-control>`
})
export class MapLayerControlComponent extends BaseControlComponent {
    protected defaultPropertyKeys:string[] = ['opacity'];
    selection:MapSelection;
    title:string = 'Select layer';
}

export const MapLayerStep:VisConfigStep = {
    icon: faLayerGroup,
    stepComponent: MapLayerStepComponent,
    controlComponent: MapLayerControlComponent
}