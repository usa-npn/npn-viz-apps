import { Component, Input, EventEmitter } from '@angular/core';
import { WmsMapLayer, MapLayer } from '../../gridded';
import { Options } from 'ng5-slider';
import { MapSelection } from './map-selection';

// TODO the selection object does not change (the layer within it does)
// so this control is not updating when switching layers
// also on load from shared URL the layer probably isn't there yet when
// the selection is available since it's loaded asynchronously so the 
// control does not render properly
@Component({
    selector: 'gridded-range-slider',
    template: `
    <ng5-slider *ngIf="options" [(value)]="min" [(highValue)]="max" [options]="options" [manualRefresh]="manualRefresh"></ng5-slider>
    `
})
export class GriddedRangeSliderControl {
    @Input() selection:MapSelection;
    options:Options;
    _min:number;
    _max:number;
    manualRefresh:EventEmitter<void> = new EventEmitter();

    resize() {
        this.manualRefresh.next();
    }

    get max():number { return this._max; }
    set max(m:number) {
        this._max = m;
        this.updateRange();
    }

    get min():number { return this._min; }
    set min(m:number) { 
        this._min = m;
        this.updateRange();
    }

    private updateRange() {
        if(this.min === this.options.floor && this.max === this.options.ceil) {
            // complete range selected, clear any style range
            this.selection.styleRange = undefined;
        } else {
            this.selection.styleRange = [this.min,this.max];
        }
    }

    private lastLayer:MapLayer;
    ngDoCheck():void {
        if(this.selection.layer !== this.lastLayer) {
            this.lastLayer = this.selection.layer;
            if(this.selection.layer instanceof WmsMapLayer) {
                this.selection.layer.getLegend().then(legend => {
                    const data = legend.getData();
                    const existingRange = this.selection.styleRange;
                    this._min = existingRange ? existingRange[0] : 0;
                    this._max = existingRange ? existingRange[1] : (data.length-1);
                    this.options = {
                        floor: 0,
                        ceil: (data.length-1),
                        step: 1,
                        showTicks: true,
                        showSelectionBar: true,
                        translate: n => data[n].label,
                        getTickColor: n => data[n].color,
                        getPointerColor: n => data[n].color,
                        getSelectionBarColor: n => data[n].color
                    };
                });
            } else {
                this.options = undefined;
            }
        }
    }
}