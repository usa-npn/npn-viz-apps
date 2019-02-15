import { VisConfigStep, StepState } from "../interfaces";

import { faBars } from '@fortawesome/pro-light-svg-icons';
import { Component } from "@angular/core";
import { ScatterPlotSelection, AXIS } from "@npn/common";
import { BaseStepComponent, BaseControlComponent } from "./base";

@Component({
    template: `
    <div class="misc" *ngIf="complete">
        <div><label>X Axis</label> {{selection.axis ? selection.axis.label : "NA"}}</div>
        <div><label>Regression lines</label> {{selection.regressionLines ? 'Yes' : 'No'}}</div>
        <div><label>Individual phenometrics</label> {{selection.individualPhenometrics ? 'Yes' : 'No'}}</div>
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
    `,
    styles:[`
    :host {
        display: flex;
        flex-direction: column;
    }
    :host >* {
        margin-bottom: 5px;
    }
    `]
})
export class ScatterPlotMiscControlComponent extends BaseControlComponent {
    title:string = 'Select visualization behavior';
    protected defaultPropertyKeys:string[] = ['axis','regressionLines','individualPhenometrics'];
    selection: ScatterPlotSelection;
    axis = AXIS;

    stepVisit():void {
        const firstVisit = !this.visited;
        super.stepVisit();
        // this feels a little less than ideal...
        if(firstVisit) {
            this.selection.redraw();
        }
    }
}

export const ScatterPlotMiscStep:VisConfigStep = {
    icon: faBars,
    stepComponent: ScatterPlotMiscStepComponent,
    controlComponent: ScatterPlotMiscControlComponent
};