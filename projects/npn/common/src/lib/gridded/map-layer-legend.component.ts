import { Component, Input, ElementRef, SimpleChanges, HostListener, HostBinding } from '@angular/core';

import { MapLayerLegend } from './map-layer-legend';

import { Selection } from 'd3-selection';
import * as d3 from 'd3';

@Component({
    selector: 'map-layer-legend',
    template:`
    <svg class="gridded-legend"></svg>
    `,
    styleUrls:[
        './map-layer-legend.component.scss'
    ]
})
export class MapLayerLegendComponent {
    @Input()
    legendTitle:string;
    @Input()
    legend:MapLayerLegend;

    private svg: Selection<any,any,any,any>;

    constructor(protected rootElement: ElementRef) {}

    @HostBinding('class')
    get legendClass() {
        const {layerType,layerName} = this.legend;
        return `${layerType||''} ${layerName ? layerName.replace(/:/g,'_') : ''}`;
    }

    ngAfterViewInit() {
        this.svg = d3.select(this.rootElement.nativeElement).select('svg');
    }

    ngOnChanges(changes:SimpleChanges):void {
        setTimeout(() => this.redraw());
    }

    @HostListener('window:resize')
    redraw() {
        if(this.svg) {
            this.svg.selectAll('g').remove();
            if(this.legend) {
                this.legend.redraw(this.svg,this.legendTitle);
            }
        }
    }
}
