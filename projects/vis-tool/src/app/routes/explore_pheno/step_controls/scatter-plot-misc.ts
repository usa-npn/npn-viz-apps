import { StepComponent, ControlComponent, VisConfigStep } from "../interfaces";

import { faBars } from '@fortawesome/pro-light-svg-icons';
import { Component } from "@angular/core";
import { ScatterPlotSelection, AXIS } from "@npn/common";

@Component({
    template: `
    <div><label>X Axis</label> {{selection.axis ? selection.axis.label : "NA"}}</div>
    <div><label>Regression lines</label> {{selection.regressionLines ? 'Yes' : 'No'}}</div>
    <div><label>Individual phenometrics</label> {{selection.individualPhenometrics ? 'Yes' : 'No'}}</div>
    `,
    styles: [`
    :host {
        display: flex;
        flex-direction: column;
    }
    :host >div {
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
export class ScatterPlotMiscStepComponent implements StepComponent {
}

@Component({
    template: `
    <mat-form-field>
        <mat-select placeholder="X Axis" name="xAxis" [(ngModel)]="selection.axis" (ngModelChange)="redrawChange()">
            <mat-option *ngFor="let a of axis" [value]="a">{{a.label}}</mat-option>
        </mat-select>
    </mat-form-field>

    <mat-checkbox [(ngModel)]="selection.regressionLines" (change)="redrawChange()">Fit Lines</mat-checkbox>

    <mat-checkbox [(ngModel)]="selection.individualPhenometrics" (change)="updateChange()">Use Individual Phenometrics</mat-checkbox>
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
export class ScatterPlotMiscControlComponent implements ControlComponent {
    selection: ScatterPlotSelection;
    axis = AXIS;

    updateChange() {
        if(this.selection.isValid()) {
            this.selection.update();
            this.selection.$updateSent = true;
        }
    }

    redrawChange() {
        if(this.selection.isValid()) {
            if(this.selection.$updateSent) {
                this.selection.redraw();
            } else {
                this.updateChange();
            }
        }
    }
}

export const ScatterPlotMiscStep:VisConfigStep = {
    title: 'Behavior',
    controlTitle: 'Select visualization behavior',
    icon: faBars,
    stepComponent: ScatterPlotMiscStepComponent,
    controlComponent: ScatterPlotMiscControlComponent
};