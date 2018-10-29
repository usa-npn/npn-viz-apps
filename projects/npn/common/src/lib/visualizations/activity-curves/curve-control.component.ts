import {Component,Input,Output,EventEmitter} from '@angular/core';
import {FormControl,Validators} from '@angular/forms';

import {Species} from '../../common';
import {ActivityCurve,ACTIVITY_CURVE_KINGDOM_METRICS} from './activity-curve';
import {ActivityCurvesSelection} from './activity-curves-selection';

@Component({
    selector: 'curve-selection-control',
    template: `
    <species-phenophase-input [(species)]="curve.species" [(phenophase)]="curve.phenophase" [selection]="selection" [disabled]="disabled" [required]="required">
    </species-phenophase-input>

    <mat-form-field class="year-input">
        <mat-select [placeholder]="'Year'+(required ? ' *':'')" [(ngModel)]="curve.year" [disabled]="disabled" [formControl]="yearControl">
            <mat-option *ngFor="let y of validYears" [value]="y">{{y}}</mat-option>
        </mat-select>
        <mat-error *ngIf="yearControl.errors && yearControl.errors.required">Year is required</mat-error>
    </mat-form-field>

    <mat-form-field class="metric-input">
        <mat-select placeholder="Metric" [(ngModel)]="curve.metric" [disabled]="!curve.validMetrics.length" [disabled]="disabled">
            <mat-option *ngFor="let m of curve.validMetrics" [value]="m">{{m.label}}</mat-option>
        </mat-select>
    </mat-form-field>
    `,
    styles: [`
        .year-input {
            width: 75px;
        }
        .metric-input {
            width: 255px;
        }
    `]
})
export class CurveControlComponent {
    @Input()
    required:boolean = true;
    @Input()
    disabled:boolean = false;
    @Input()
    selection: ActivityCurvesSelection;
    @Input()
    curve: ActivityCurve;

    yearControl:FormControl = new FormControl(null,/*Validators.required*/(c) => {
        if(this.required && !c.value) {
            return {
                required: true
            };
        }
        return null;
    });



    validYears:number[] = (function() {
        let thisYear = (new Date()).getFullYear(),
            years: number[] = [],
            c = 2010;
        while(c < thisYear) {
            years.push(c++);
        }
        return years;
    })();
}
