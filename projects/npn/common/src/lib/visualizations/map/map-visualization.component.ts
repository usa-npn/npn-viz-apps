import { Component, Input, ElementRef } from '@angular/core';
import { ObservableMedia } from "@angular/flex-layout";

import { MapVisualizationBaseComponent } from '../map-visualization-base.component';
import { MapSelection } from './map-selection';

@Component({
    selector: 'map-visualization',
    templateUrl: '../map-visualization-base.component.html',
    styleUrls: ['../map-visualization-base.component.scss']
})
export class MapVisualizationComponent extends MapVisualizationBaseComponent {
    @Input() selection:MapSelection;

    constructor(protected rootElement: ElementRef, protected media: ObservableMedia) {
        super(rootElement,media);
    }

    // TODO over-ride most inherited functionality (or don't inherit it)
    protected resize():void {
        // parent forces width/height to align with other visualization aspect ratio.
        this.getMap().then(map => google.maps.event.trigger(map, 'resize'));
    }
}