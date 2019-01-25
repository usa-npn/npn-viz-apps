import { BaseStepComponent, BaseControlComponent } from './base';
import { StepState, VisConfigStep } from '../interfaces';
import { Component } from '@angular/core';
import { NpnMapLayerService, MapSelection } from '@npn/common';
import { faLayerGroup } from '@fortawesome/pro-light-svg-icons';
import { MapLayerDefs, MapLayerDefinition } from '@npn/common/gridded/gridded-common';


@Component({
    template: ``
})
export class LayerStepComponent extends BaseStepComponent {
    title:string = 'Layer';

    get state():StepState {
        return this.visited
            ? StepState.COMPLETE
            : StepState.AVAILABLE;
    }
}

@Component({
    template: `
    <ul class="select-tree">
      <li *ngFor="let cat of layerDefinitions?.categories">
        <node-label>{{cat.name}}</node-label>
        <ul class="level-1">
            <li *ngFor="let layer of cat.layers" class="leaf"  [ngClass]="{selected:layer.name === selection.wmsMapLayer}">
                <node-label (click)="layerClick(layer)">{{layerTitle(layer)}}</node-label>
            </li>
        </ul>
      </li>
    </ul>
    `
})
export class LayerControlComponent extends BaseControlComponent {
    selection:MapSelection;
    title:string = 'Select layer';
    layerDefinitions:MapLayerDefs;

    constructor(private layerService:NpnMapLayerService) {
        super();
    }

    layerTitle(layer) {
        const ds = layer.title.indexOf('- ');
        return ds !== -1
            ? layer.title.substring(ds+2)
            : layer.title;
    }

    layerClick(layer:MapLayerDefinition) {
        this.selection.wmsMapLayer = this.selection.wmsMapLayer !== layer.name
            ? layer.name
            : undefined;
        this.selection.redraw();
    }

    ngOnInit() {
        this.layerService.getLayerDefinitions().then(defs => this.layerDefinitions = defs);
    }
}

export const LayerStep:VisConfigStep = {
    icon: faLayerGroup,
    stepComponent: LayerStepComponent,
    controlComponent: LayerControlComponent
}