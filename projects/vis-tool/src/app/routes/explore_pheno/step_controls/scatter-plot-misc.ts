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
        return this.selection.validPlots.length
            ? this.visited
                ? StepState.COMPLETE
                : StepState.AVAILABLE
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

    <mat-checkbox [(ngModel)]="selection.regressionLines" (change)="selection.redraw()">Fit Lines</mat-checkbox>

    <mat-checkbox [(ngModel)]="selection.individualPhenometrics" (change)="selection.update()">Use Individual Phenometrics</mat-checkbox>

    <h4 class="slider-title">From/To</h4>
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
    .slider-title {
        text-transform: none !important;
        margin-top: 10px;
    }
    .slider-wrapper {
        height: 500px;
    }
    `],
    providers:[
        LegendDoyPipe
    ]
})
export class ScatterPlotMiscControlComponent extends BaseControlComponent {
    title:string = 'Select visualization behavior';
    protected defaultPropertyKeys:string[] = ['axis','regressionLines','individualPhenometrics','minDoy','maxDoy'];
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
                showSelectionBar: true,
                vertical: true,
                translate: doy => {
                    return this.doyPipe.transform(doy)+ ` (${doy})`;
                }
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