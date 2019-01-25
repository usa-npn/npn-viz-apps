import { Component, Input, SimpleChanges } from '@angular/core';
import { WmsMapLayer } from './wms-map-layer';
import { Options } from 'ng5-slider';

@Component({
    selector: 'gridded-range-slider',
    template: `
    <ng5-slider *ngIf="options" [(value)]="min" [(highValue)]="max" [options]="options"></ng5-slider>
    `
})
export class GriddedRangeSliderControl {
    @Input() layer:WmsMapLayer;
    options:Options;
    _min:number;
    _max:number;

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
            this.layer.setStyleRange(undefined);
        } else {
            this.layer.setStyleRange([this.min,this.max]);
        }
    }

    ngOnChanges(changes:SimpleChanges):void {
        if(changes.layer && changes.layer.currentValue) {
            console.log('RangeSliderControl.ngOnChanges',this.layer);
            // currently only WwmsMapLayer supports style ranges.
            // and while the instance variable is strongly typed what
            // gets passed into the component may be something else
            // (whatever type of layer is on the map)...
            if(this.layer instanceof WmsMapLayer) {
                this.layer.getLegend().then(legend => {
                    const data = legend.getData();
                    const existingRange = this.layer.getStyleRange();
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