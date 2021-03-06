import { BaseStepComponent, BaseControlComponent, BaseSubControlComponent } from './base';
import { StepState, VisConfigStep } from '../interfaces';
import { Component, ViewChild } from '@angular/core';
import { NpnMapLayerService, MapSelection, GriddedRangeSliderControl } from '@npn/common';
import { faLayerGroup } from '@fortawesome/pro-light-svg-icons';
import { MapLayerDefs, MapLayerDefinition } from '@npn/common/gridded/gridded-common';
import { getLayerTitle } from './map-layer';

// NOTE: This step/control are not currently in use but still compiled into the application
// and taking up space...  It would be nice to keep the code around but before release
// these should perhaps be excluded from the possible list of entryComponents so that
// tree shaking can exclude them...
const LAYER_TITLE_SPLIT_REGEX = /(,|\s-\s)/;
function layerTitle(layer) {
    if(layer) {
        const ds = layer.title.indexOf('- ');
        return ds !== -1
            ? layer.title.substring(ds+2)
            : layer.title;
    }
}
@Component({
    template: `<pre>{{getTitle()}}</pre><div>{{selection.layer?.extent?.current?.label}}</div>`,
    styles: [`
    pre {
        margin: 0px;
        font-family: inherit;
    }
    `]
})
export class LayerStepComponent extends BaseStepComponent {
    title:string = 'Layer';

    get state():StepState {
        return this.visited
            ? StepState.COMPLETE
            : StepState.AVAILABLE;
    }

    getTitle() {
        return getLayerTitle(this.selection.layer);
    }
}

@Component({
    template: `
    <ul class="select-tree">
      <li *ngFor="let cat of layerDefinitions?.categories">
        <node-label>{{cat.name}}</node-label>
        <ul class="level-1">
            <li *ngFor="let layer of cat.layers" class="leaf"  [ngClass]="{selected:layer.name === selection.layerName}">
                <node-label (click)="layerClick(layer)">{{layerTitle(layer)}}</node-label>
            </li>
        </ul>
      </li>
    </ul>
    `
})
export class LayerControlComponent extends BaseControlComponent {
    protected defaultPropertyKeys:string[] = ['opacity'];
    selection:MapSelection;
    title:string = 'Select layer';
    layerDefinitions:MapLayerDefs;
    subControlComponent:LayerControlSubComponent;

    constructor(private layerService:NpnMapLayerService) {
        super();
    }

    stepVisit():void {
        super.stepVisit();
        if(this.selection.layerName) {
            setTimeout(() => this.subControlComponent.show());
        }
    }

    layerTitle(layer) {
        return layerTitle(layer);
    }

    layerClick(layer:MapLayerDefinition) {
        if(this.selection.layerName !== layer.name) {
            this.selection.layerName = layer.name;
            this.selection.redraw();
        }
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
        <extent-control [selection]="selection"></extent-control>
        <supports-opacity-control [supportsOpacity]="selection"></supports-opacity-control>
        <gridded-range-slider [selection]="selection"></gridded-range-slider>
        <p *ngIf="selection.layer.hasAbstract()" [innerHTML]="selection.layer.getAbstract()"></p>
    </div>
    `,
    styles:[`
    .layer-controls {
        width: 400px;
    }
    .layer-controls >p {
        margin: 12px 0px 0px 0px;
    }
    `]
})
export class LayerControlSubComponent extends BaseSubControlComponent {
    title:string = 'Tailor your layer';
    @ViewChild(GriddedRangeSliderControl) rangeSlider:GriddedRangeSliderControl;

    show():void {
        super.show();
        // the range slider won't automatically re-layout
        if(this.rangeSlider) {
            setTimeout(() => this.rangeSlider.resize());
        }
    }
}

export const LayerStep:VisConfigStep = {
    icon: faLayerGroup,
    stepComponent: LayerStepComponent,
    controlComponent: LayerControlComponent,
    subControlComponent: LayerControlSubComponent
}