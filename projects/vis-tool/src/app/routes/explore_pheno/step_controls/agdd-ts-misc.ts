import { BaseStepComponent, BaseControlComponent } from './base';
import { AgddTimeSeriesSelection } from '@npn/common';
import { StepState, VisConfigStep } from '../interfaces';
import { Component } from '@angular/core';
import { faBars } from '@fortawesome/pro-light-svg-icons';
import { FormControl } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';

// TODO DOY should be date-range Jan 1 - Dec 31
@Component({
    template: `
    <div class="misc" *ngIf="complete">
        <div><label>AGDD Threshold</label> {{selection.threshold | number:'1.0-0'}}&deg;</div>
        <div><label>Show days of year</label> Jan 1 - {{selection.doy | legendDoy}}</div>
        <div><label>Show last year</label> {{selection.showLastYear ? 'Yes' : 'No'}}</div>
    </div>
    `,
    styles: [`
    .misc {
        display: flex;
        flex-direction: column;
    }
    .misc >div {
        padding-bottom: 5px;
    }
    label {
        font-weight: 600;
    }
    label:after {
        content: ':';
    }
    `]
})
export class AgddTsMiscStepComponent extends BaseStepComponent {
    title:string = 'Behavior';
    selection:AgddTimeSeriesSelection;

    get state():StepState {
        return this.selection.isValid()
            ? this.visited ? StepState.COMPLETE : StepState.AVAILABLE
            : StepState.UNAVAILABLE;
    }
}

@Component({
    template: `
    <label>AGDD Threshold ({{selection.threshold | number:'1.0-0'}}&deg;)
    <mat-slider min="0" [max]="selection.thresholdCeiling" step="1" tickInterval="1000" [thumbLabel]="selection.threshold" [(ngModel)]="selection.threshold"></mat-slider>
    </label>
    <label>Days of Year (Jan 1 - {{selection.doy | legendDoy}})
    <mat-slider min="1" max="365" step="1" tickInterval="10" [thumbLabel]="selection.doy" [(ngModel)]="selection.doy"></mat-slider>
    </label>
    <mat-checkbox [(ngModel)]="selection.showLastYear" [disabled]="!selection.lastYearValid">Show last year</mat-checkbox>
    `
})
export class AgddTsMiscControlComponent extends BaseControlComponent {
    title:string = 'Select visualization behavior';
    selection:AgddTimeSeriesSelection;

    stepVisit():void {
        super.stepVisit();
        this.selection.resume();
        this.selection.reset();
        this.selection.update();
    }
}

export const AgddTsMiscStep:VisConfigStep = {
    icon: faBars,
    stepComponent: AgddTsMiscStepComponent,
    controlComponent: AgddTsMiscControlComponent
};