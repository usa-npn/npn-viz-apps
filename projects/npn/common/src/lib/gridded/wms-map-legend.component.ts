import { Component, Input, ElementRef, SimpleChanges } from '@angular/core';

import { MonitorsDestroy } from '../common/index';
import { NpnMapLegend, PestMapLegend } from './wms-map-legend';

import { fromEvent } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { Selection } from 'd3-selection';
import * as d3 from 'd3';

@Component({
    selector: 'wms-map-legend',
    template:`
    <svg class="gridded-legend"></svg>
    `,
    styles:[`
        :host {
            display: block;
        }
        .gridded-legend {
            width: 100%;
        }
    `]
})
export class WmsMapLegendComponent extends MonitorsDestroy {
    @Input()
    legendTitle:string;
    @Input()
    legend:NpnMapLegend;

    private svg: Selection<any,any,any,any>;

    constructor(protected rootElement: ElementRef) {
        super();
    }

    ngAfterViewInit() {
        console.debug('WmsMapLegendComponent.ngAfterViewInit');
        fromEvent(window,'resize')
            .pipe(
                debounceTime(500),
                takeUntil(this.componentDestroyed)
            )
            .subscribe(event => this.redraw());
        this.svg = d3.select(this.rootElement.nativeElement).select('svg');
        console.debug('WmsMapLegendComponent:SVG',this.svg);
    }

    ngOnChanges(changes:SimpleChanges):void {
        console.debug('WmsMapLegendComponent.ngOnChanges',changes);
        setTimeout(() => this.redraw()); // all that can change at the moment is the reference to legend
    }

    redraw() {
        if(this.svg) {
            this.svg.selectAll('g').remove();
            if(this.legend) {
                this.legend.redraw(this.svg,this.legendTitle);
            }
        }
    }
}
