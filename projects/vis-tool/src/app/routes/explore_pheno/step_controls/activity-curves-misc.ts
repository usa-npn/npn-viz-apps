import { BaseStepComponent, BaseControlComponent } from './base';
import { Component } from '@angular/core';
import {
    ActivityCurvesSelection,
    ActivityFrequency,
    ACTIVITY_FREQUENCIES,
    INTERPOLATE,
    ACTIVITY_CURVES_INTERPOLATES
} from '@npn/common';
import { VisConfigStep, StepState } from '../interfaces';
import { faBars } from '@fortawesome/pro-light-svg-icons';

@Component({
    template: `
    <div class="misc"  *ngIf="selection.isValid()">
        <div><label>Date Interval</label> {{selection.frequency?.label}}</div>
        <div><label>Line Interpolation</label> {{interpolate}}</div>
        <div><label>Show Data Points</label> {{selection.dataPoints ? 'Yes' : 'No'}}</div>
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
export class ActivityCurvesMiscStepComponent extends BaseStepComponent {
    title:string = 'Behavior';
    selection: ActivityCurvesSelection;

    get interpolate():string {
        const {interpolate} = this.selection;
        return interpolate
            ? ACTIVITY_CURVES_INTERPOLATES.find(interp => interp.value === interpolate).label
            : '';
    }

    get state():StepState {
        if(this.selection.isValid()) {
            return StepState.COMPLETE;
        }
        return this.selection.hasValidCurve()
            ? this.visited
                ? StepState.COMPLETE
                : StepState.AVAILABLE
            : StepState.UNAVAILABLE;
    }
}

/**
 * IMPORTANT: logic duplicated from activity-curves-control.component
 */
@Component({
    template: `
    <mat-form-field class="date-interval">
        <mat-select placeholder="Date Interval" [(ngModel)]="selection.frequency">
            <mat-option *ngFor="let f of frequencies" [value]="f">{{f.label}}</mat-option>
        </mat-select>
    </mat-form-field>

    <mat-form-field class="line-interpolateion">
        <mat-select placeholder="Line Interpolation" [(ngModel)]="selection.interpolate">
            <mat-option *ngFor="let i of interpolates" [value]="i.value">{{i.label}}</mat-option>
        </mat-select>
    </mat-form-field>

    <mat-checkbox [(ngModel)]="selection.dataPoints">Show data points</mat-checkbox>
    `,
    styles:[`
    :host {
        display: flex;
        flex-direction: column;
    }
    `]
})
export class ActivityCurvesMiscControlComponent extends BaseControlComponent {
    title:string = 'Select visualization behavior';
    selection: ActivityCurvesSelection;
    protected defaultPropertyKeys:string[] = ['interpolate','frequency','dataPoints'];

    frequencies:ActivityFrequency[] = ACTIVITY_FREQUENCIES;
    interpolates:any[] = ACTIVITY_CURVES_INTERPOLATES;

    stepVisit():void {
        const firstVisit = !this.visited;
        super.stepVisit();
        if(firstVisit) {
            this.selection.update();
        }
    }
}

export const ActivityCurvesMiscStep:VisConfigStep = {
    icon: faBars,
    stepComponent: ActivityCurvesMiscStepComponent,
    controlComponent: ActivityCurvesMiscControlComponent
}