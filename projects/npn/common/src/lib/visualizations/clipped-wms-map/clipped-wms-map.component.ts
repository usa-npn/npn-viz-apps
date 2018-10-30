import {Component,Input,ElementRef, ViewEncapsulation} from '@angular/core';
import { ObservableMedia } from "@angular/flex-layout";

import {MapVisualizationBaseComponent} from '../map-visualization-base.component';

import {ClippedWmsMapSelection} from './clipped-wms-map-selection';

@Component({
    selector: 'clipped-wms-map',
    templateUrl: './clipped-wms-map.component.html',
    styleUrls: ['./clipped-wms-map.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class ClippedWmsMapComponent extends MapVisualizationBaseComponent {
    @Input() selection: ClippedWmsMapSelection;

    constructor(protected rootElement: ElementRef, protected media: ObservableMedia) {
        super(rootElement,media);
    }

    mapReady(map:google.maps.Map): void {
        // TODO should be private.
        this.getMapResolver(map);
    }

    protected reset(): void {
        this.getMap().then(m => {
            this.selection.removeFrom(m)
                .then(() => {
                    super.reset();
                });
        });
    }

    protected update(): void {
        this.resize();
        this.getMap().then(m => {
            this.selection.removeFrom(m)
                .then(() => {
                    this.selection.addTo(m)
                });
        });
    }

    protected resize(): void {
        super.resize();
        this.getMap().then(m => this.selection.resizeMap(m));
    }
}
