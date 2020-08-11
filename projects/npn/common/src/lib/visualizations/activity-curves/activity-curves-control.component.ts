import {Component,Input} from '@angular/core';

import {INTERPOLATE, ActivityCurve} from './activity-curve';
import {ActivityCurvesSelection,ActivityFrequency,ACTIVITY_FREQUENCIES} from './activity-curves-selection';
import {STATIC_COLORS} from '../../common';
import { faExclamationTriangle } from '@fortawesome/pro-light-svg-icons';

export const ACTIVITY_CURVES_INTERPOLATES = [{
    value: INTERPOLATE.linear,
    label: 'Linear'
},{
    value: INTERPOLATE.monotone,
    label: 'Monotone',
},{
    value: INTERPOLATE.stepAfter,
    label: 'Step after'
}];

@Component({
    selector: 'activity-curves-control',
    template: `
    <div *ngIf="!selection.canAddPlot" class="max-plots-reached"><fa-icon [icon]="faExclamationTriangle"></fa-icon> One more curve would exceed the maximum of {{selection.MAX_PLOTS}} allowed</div>
    <div class="curve mat-elevation-z1" *ngFor="let curve of selection.curves; index as i">
        <label>Curve #{{i+1}}</label>
        <curve-selection-control
            [selection]="selection"
            [curve]="curve"
            [required]="i === 0"
            [gatherColor]="true"
            [allowCurrentYear]="allowCurrentYear"
            (onSpeciesChange)="speciesMetricChange($event)"
            (onMetricChange)="speciesMetricChange($event)">
            </curve-selection-control>
        <div class="action-holder">
            <button *ngIf="selection.curves.length > 1" mat-button (click)="removeCurve(i)">Remove curve</button>
            <button *ngIf="i === selection.curves.length-1" mat-button (click)="addCurve()" [disabled]="!selection.canAddPlot">Add curve</button>
        </div>
    </div>
    <div class="curve-common">
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
    </div>
    `,
    styles:[`
        .curve,
        .curve-common {
            display: flex;
            align-items: center;
            margin: 2px 2px 5px 2px;
            padding: 4px;
        }
        .curve-common {
            margin-top: 10px;
        }
        .curve >label {
            white-space: nowrap;
        }
        .curve >label:after {
            content: ':';
            margin-right: 10px;
        }
        .curve >.action-holder {
            display: flex;
            flex-direction: column;
        }
        .date-interval {
            width: 125px;
        }
        .line-interpolateion {
            width: 150px;
        }
        .action-holder {
            margin: 10px 0px;
            text-align: right;
        }
    `]
})
export class ActivityCurvesControlComponent {
    @Input()
    selection: ActivityCurvesSelection;
    @Input()
    allowCurrentYear:boolean = false;

    frequencies:ActivityFrequency[] =  ACTIVITY_FREQUENCIES;
    interpolates:any[] = ACTIVITY_CURVES_INTERPOLATES;
    faExclamationTriangle = faExclamationTriangle;

    addCurve() {
        const curve = new ActivityCurve();
        curve.id = this.selection.curves.length;
        curve.color = STATIC_COLORS[curve.id];
        curve.selection = this.selection;
        this.selection.curves.push(curve);
    }

    removeCurve(i) {
        this.selection.curves.splice(i,1);
        this.selection.update();
        this.speciesMetricChange();
    }

    speciesMetricChange() {
        // need to prevent more than two metrics being selected
        const curves = this.selection.curves||[];
        const selectedMetrics = [];
        curves.forEach(c => {
            c.overrideValidMetricsReset();
            if(selectedMetrics.length === 2) {
                const valid = c.validMetrics;
                c.overrideValidMetrics(selectedMetrics.filter(m => valid.indexOf(m) !== -1));
            } else if (c.metric && selectedMetrics.indexOf(c.metric) === -1) {
                selectedMetrics.push(c.metric);
            }
        });
    }
}
