import { BaseStepComponent, BaseControlComponent, BaseSubControlComponent } from './base';
import { StepState, VisConfigStep } from '../interfaces';
import { Component } from '@angular/core';
import { NpnMapLayerService, MapSelection } from '@npn/common';
import { faLayerGroup } from '@fortawesome/pro-light-svg-icons';
import { MapLayerDefs, MapLayerDefinition } from '@npn/common/gridded/gridded-common';

function layerTitle(layer) {
    if(layer) {
        const ds = layer.title.indexOf('- ');
        return ds !== -1
            ? layer.title.substring(ds+2)
            : layer.title;
    }
}
@Component({
    template: `{{layerTitle(selection.layer)}}`
})
export class LayerStepComponent extends BaseStepComponent {
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
    subControlComponent:LayerControlSubComponent;

    constructor(private layerService:NpnMapLayerService) {
        super();
    }

    layerTitle(layer) {
        return layerTitle(layer);
    }

    layerClick(layer:MapLayerDefinition) {
        this.selection.wmsMapLayer = this.selection.wmsMapLayer !== layer.name
            ? layer.name
            : undefined;
        this.selection.redraw();
        if(layer.name) {
            this.subControlComponent.show();
        }
    }

    ngOnInit() {
        this.layerService.getLayerDefinitions().then(defs => this.layerDefinitions = defs);
    }
}

@Component({
    template: `
    <div *ngIf="selection.layer" class="layer-controls">
        <supports-opacity-control [supportsOpacity]="selection.layer"></supports-opacity-control>
        <gridded-range-slider [layer]="selection.layer"></gridded-range-slider>
    </div>
    `,
    styles:[`
    .layer-controls {
        min-width: 400px;
    }
    `]
})
export class LayerControlSubComponent extends BaseSubControlComponent {
    title:string = 'Taylor your layer';
}

export const LayerStep:VisConfigStep = {
    icon: faLayerGroup,
    stepComponent: LayerStepComponent,
    controlComponent: LayerControlComponent,
    subControlComponent: LayerControlSubComponent
}