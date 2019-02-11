import { BaseStepComponent, BaseControlComponent } from './base';
import { Component } from '@angular/core';
import { StepState, VisConfigStep } from '../interfaces';
import { MapSelection } from '@npn/common';
import { faLayerGroup } from '@fortawesome/pro-light-svg-icons';

const LAYER_TITLE_SPLIT_REGEX = /(,|\s-\s)/;
export function getLayerTitle(layer) {
    if(layer) {
        let t = layer.title;
        if(t) {
            return t.split(LAYER_TITLE_SPLIT_REGEX)
                .filter(s => !LAYER_TITLE_SPLIT_REGEX.test(s)) // odd, no mentionof delimiters being returned whne using regex
                .map(s => s.trim())
                .join("\n");
        }
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
export class MapLayerStepComponent extends BaseStepComponent {
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