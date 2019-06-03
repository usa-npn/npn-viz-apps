import { VisConfigStep, StepState } from "../interfaces";

import { faBars } from '@fortawesome/pro-light-svg-icons';
import { Component } from "@angular/core";
import { ScatterPlotSelection, AXIS, LegendDoyPipe } from "@npn/common";
import { BaseStepComponent, BaseControlComponent } from "./base";
import { Options } from 'ng5-slider';

@Component({
    template: `
    <div class="misc" *ngIf="complete">
        <div><label>X Axis</label> {{selection.axis ? selection.axis.label : "NA"}}</div>
        <div><label>Regression lines</label> {{selection.regressionLines ? 'Yes' : 'No'}}</div>
        <div><label>Individual phenometrics</label> {{selection.individualPhenometrics ? 'Yes' : 'No'}}</div>
        <div><label>Data precision filter</label> {{selection.numDaysQualityFilter}} days</div>
        <div><label>Exclude less precise data</label> {{selection.filterLqdSummary ? 'Yes' : 'No'}}</div>
        <div><label>From</label> {{selection.minDoy | legendDoy}} ({{selection.minDoy}})</div>
        <div><label>To</label> {{selection.maxDoy | legendDoy}} ({{selection.maxDoy}})</div>
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
    `],
    providers: [
        LegendDoyPipe
    ]
})
export class ScatterPlotMiscStepComponent extends BaseStepComponent {
    title:string = 'Behavior';
    selection: ScatterPlotSelection;

    get state():StepState {
        const nearValid = this.selection.start && this.selection.end && this.selection.end > this.selection.start && this.selection.validPlots.length > 0
        return nearValid &&
            !!this.selection.axis &&
                typeof(this.selection.numDaysQualityFilter) === 'number' &&
                typeof(this.selection.regressionLines) === 'boolean' &&
                typeof(this.selection.filterLqdSummary) === 'boolean' &&
                typeof(this.selection.regressionLines) === 'boolean' &&
                typeof(this.selection.individualPhenometrics) === 'boolean'
            ? StepState.COMPLETE
            : nearValid
                ? StepState.AVAILABLE
                : StepState.UNAVAILABLE;
    }
}

@Component({
    template: `
    <mat-form-field>
        <mat-select placeholder="X Axis" name="xAxis" [(ngModel)]="selection.axis" (ngModelChange)="selection.redraw()">
            <mat-option *ngFor="let a of axis" [value]="a">{{a.label}}</mat-option>
        </mat-select>
    </mat-form-field>

    <mat-form-field>
        <mat-select placeholder="Data precision filter" [(value)]="selection.numDaysQualityFilter">
            <mat-option [value]="7">7 days</mat-option>
            <mat-option [value]="14">14 days</mat-option>
            <mat-option [value]="30">30 days</mat-option>
        </mat-select>
    </mat-form-field>

    <h4 class="misc-title exclude">Exclude less precise data</h4>
    <mat-radio-group [(ngModel)]="selection.filterLqdSummary">
        <mat-radio-button [value]="true">Yes</mat-radio-button>
        <mat-radio-button [value]="false">No</mat-radio-button>
    </mat-radio-group>

    <mat-checkbox [(ngModel)]="selection.regressionLines" (change)="selection.redraw()">Fit Lines</mat-checkbox>

    <mat-checkbox [(ngModel)]="selection.individualPhenometrics" (change)="selection.update()">Use Individual Phenometrics</mat-checkbox>

    <h4 class="misc-title to-from">From/To</h4>
    <div class="slider-wrapper">
        <ng5-slider *ngIf="doyOptions" [(value)]="selection.minDoy" [(highValue)]="selection.maxDoy" [options]="doyOptions"></ng5-slider>
    </div>
    `,
    styles:[`
    :host {
        display: flex;
        flex-direction: column;
    }
    :host >* {
        margin-bottom: 5px;
    }
    .misc-title {
        text-transform: none !important;
    }
    .misc-title.exclude {
        margin-top: 0px;
    }
    .misc-title.to-from {
        margin-top: 10px;
    }
    .slider-wrapper {
        height: 500px;
    }
    mat-radio-button {
        margin-right: 5px;
    }
    mat-checkbox {
        margin-top: 5px;
    }
    `],
    providers:[
        LegendDoyPipe
    ]
})
export class ScatterPlotMiscControlComponent extends BaseControlComponent {
    title:string = 'Select visualization behavior';
    protected defaultPropertyKeys:string[] = ['axis','regressionLines','individualPhenometrics','minDoy','maxDoy','filterLqdSummary','numDaysQualityFilter'];
    selection: ScatterPlotSelection;
    axis = AXIS;

    doyOptions:Options;

    constructor(private doyPipe:LegendDoyPipe){
        super();
    }

    stepVisit():void {
        const firstVisit = !this.visited;
        super.stepVisit();
        // this feels a little less than ideal...
        if(firstVisit) {
            console.log(`minDoy=${this.selection.minDoy}, maxDoy=${this.selection.maxDoy}`);
            this.doyOptions = {
                floor: 1,
                ceil: 365,
                step: 1,
                // tick 1st of each Month
                ticksArray: [1,32,60,91,121,152,182,213,244,274,305,335,365],
                showTicks: true,
                vertical: true,
                translate: doy => this.doyPipe.transform(doy)+ ` (${doy})`
            };
            this.selection.redraw();
        }
    }
}

export const ScatterPlotMiscStep:VisConfigStep = {
    icon: faBars,
    stepComponent: ScatterPlotMiscStepComponent,
    controlComponent: ScatterPlotMiscControlComponent
};