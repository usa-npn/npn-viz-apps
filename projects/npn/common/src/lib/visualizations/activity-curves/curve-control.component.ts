import {Component,Input,SimpleChanges} from '@angular/core';
import {FormControl} from '@angular/forms';

import {MonitorsDestroy} from '../../common';
import {ActivityCurve} from './activity-curve';
import {ActivityCurvesSelection} from './activity-curves-selection';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'curve-selection-control',
    template: `
    <species-phenophase-input
        [(species)]="curve.species"
        [(phenophase)]="curve.phenophase"
        [(color)]="curve.color"
        [gatherColor]="gatherColor"
        [selection]="selection"
        [disabled]="disabled"
        [required]="required">
    </species-phenophase-input>

    <mat-form-field class="year-input">
        <mat-select [placeholder]="'Year'+(required ? ' *':'')" [formControl]="yearControl">
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
export class CurveControlComponent extends MonitorsDestroy {
    @Input()
    gatherColor:boolean = false;
    @Input()
    required:boolean = true;
    @Input()
    disabled:boolean = false;
    @Input()
    selection: ActivityCurvesSelection;
    @Input()
    curve: ActivityCurve;

    yearControl:FormControl;

    validYears:number[] = (function() {
        let thisYear = (new Date()).getFullYear(),
            years: number[] = [],
            c = 2010;
        while(c < thisYear) {
            years.push(c++);
        }
        return years;
    })();

    ngOnInit() {
        this.yearControl = new FormControl(this.curve.year,/*Validators.required*/(c) => {
            if(this.required && !c.value) {
                return {
                    required: true
                };
            }
            return null;
        });
        if(this.disabled) {
            this.yearControl.disable();
        }
        this.yearControl.valueChanges
            .pipe(takeUntil(this.componentDestroyed))
            .subscribe(y => this.curve.year = y);
    }

    ngOnChanges(changes:SimpleChanges):void {
        if(changes.disabled && this.yearControl) {
            if(changes.disabled.currentValue) {
                this.yearControl.disable();
            } else {
                this.yearControl.enable();
            }
        }
    }    
}
