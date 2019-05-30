import { BaseStepComponent, BaseControlComponent } from './base';
import { Component } from '@angular/core';
import { StepState, VisConfigStep } from '../interfaces';
import { MapSelection, MapLayer, MapLayerExtentValue, MapLayerExtentType } from '@npn/common';
import { faCalendar } from '@fortawesome/pro-light-svg-icons';
import * as d3 from 'd3';
import { FormControl } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';

@Component({
    template: `<div *ngIf="complete">{{selection.year}}</div>`,

})
export class MapYearStepComponent extends BaseStepComponent {
    title:string = 'Year';

    get state():StepState {
        return this.selection.year
            ? StepState.COMPLETE
            : StepState.AVAILABLE;
    }
}

@Component({
    template: `
    <mat-form-field>
        <mat-select placeholder="Year" [formControl]="yearControl" (selectionChange)="selection.update()">
            <mat-option *ngFor="let y of validYears" [value]="y">{{y}}</mat-option>
        </mat-select>
    </mat-form-field>
    <p class="year-disclaimer" *ngIf="yearControl.disabled">The map layer you have selected is displaying imagery for the year {{yearControl.value}}.  As a result you can only plot data for that year.</p>
    `,
    styles:[`
    :host {
        display: block;
    }
    .year-disclaimer {
        max-width: 200px;
    }
    `]
})
export class MapYearControlComponent extends BaseControlComponent {
    selection:MapSelection;
    title:string = 'Select year';

    yearControl:FormControl;
    validYears:number[] = d3.range(1900,((new Date()).getFullYear()+1)).reverse();

    ngOnInit() {
        this.yearControl = new FormControl(this.selection.year);
        this.yearControl.valueChanges
            .pipe(takeUntil(this.componentDestroyed))
            .subscribe(y => this.selection.year = y);
    }

    private lastLayer:MapLayer;
    private lastExtent:MapLayerExtentValue;
    ngDoCheck():void {
        if(this.lastLayer !== this.selection.layer) {
            console.log(`MapYearControlComponent layer change....`);
            this.lastLayer = this.selection.layer;
            this.lastExtent = null;
        }
        if(this.lastLayer && this.lastLayer.extent && this.lastLayer.extent.current !== this.lastExtent) {
            console.log(`MapYearControlComponent extent change...`)
            if((this.lastExtent = this.lastLayer.extent.current)/* && this.lastExtent.date DOY extents have no date*/) {
                let validYear:number = this.lastLayer.extentType === MapLayerExtentType.DOY
                    ? null // any year is OK
                    : this.lastExtent.date.getFullYear();
                setTimeout(() => {
                    if(validYear) {
                        if(this.yearControl.value !== validYear) {
                            this.yearControl.setValue(validYear);
                        }
                        if(this.yearControl.enabled) {
                            this.yearControl.disable();
                        }
                    } else {
                        // any year will do make sure the control is enabled
                        if(this.yearControl.disabled) {
                            this.yearControl.enable();
                        }
                    }
                });
            }
        } else if (!this.lastLayer) {
            if(this.yearControl.disabled) {
                this.yearControl.enable();
            }
        }
    }
}

export const MapYearStep:VisConfigStep = {
    icon: faCalendar,
    stepComponent: MapYearStepComponent,
    controlComponent: MapYearControlComponent
}