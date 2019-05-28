import { BaseStepComponent, BaseControlComponent } from './base';
import { Component, ViewEncapsulation } from '@angular/core';
import { ActivityCurvesSelection, ActivityCurve, SPECIES_PHENO_INPUT_COLORS } from '@npn/common';
import { VisConfigStep, StepState } from '../interfaces';
import { faChartLine } from '@fortawesome/pro-light-svg-icons';

@Component({
    template: `
    <div class="curve" *ngFor="let c of selection.validCurves; index as i"
        [ngStyle]="{'border-left-color':c.color}">
        <div>{{c.species | speciesTitle}}</div>
        <div>{{c.phenophase.phenophase_name}}</div>
        <div>{{c.year}}</div>
        <div>{{c.metric.label}}</div>
    </div>
    `,
    styles:[`
    .curve {
        border-left-style: solid;
        border-left-width: 3px;
        padding-left: 5px;
        margin-bottom: 5px;
    }
    :host>.curve:last-of-type {
        margin-bottom: 0px;
    }
    `]
})
export class ActivityCurvesStepComponent extends BaseStepComponent {
    title:string = 'Curves';
    selection: ActivityCurvesSelection;

    get state():StepState {
        return this.selection.isValid()
            ? StepState.COMPLETE
            : StepState.AVAILABLE;
    }
}

@Component({
    template: `
    <mat-expansion-panel  *ngFor="let curve of selection.curves; index as i" [expanded]="i < 2">
        <mat-expansion-panel-header>
            <mat-panel-title>
                <label [ngStyle]="{'color': curve.color}">Curve {{i+1}}</label>
            </mat-panel-title>
        </mat-expansion-panel-header>
        <curve-selection-control [selection]="selection"  [curve]="curve" [required]="i === 0" [gatherColor]="true"></curve-selection-control>
    </mat-expansion-panel>
    <div class="add-holder">
        <button mat-button [disabled]="!allValid" (click)="addCurve()">Add curve</button>
    </div>
    `,
    encapsulation: ViewEncapsulation.None,
    styles:[`
    curve-selection-control,
    species-phenophase-input {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
    }
    species-phenophase-input .species-input,
    species-phenophase-input .phenophase-input,
    .metric-input
     {
        width: 100% !important;
    }
    .add-holder {
        margin: 10px 0px;
        text-align: right;
    }
    `]
})
export class ActivityCurvesControlComponent extends BaseControlComponent {
    title:string = 'Select activity curves';
    selection: ActivityCurvesSelection;
    protected defaultPropertyKeys:string[] = ['curves'];

    get allValid():boolean {
        return this.selection.curves.reduce((valid,c) => valid && c.isValid(), this.selection.curves[0].isValid());
    }

    addCurve() {
        const curve = new ActivityCurve();
        curve.id = this.selection.curves.length;
        curve.color = SPECIES_PHENO_INPUT_COLORS[curve.id];
        curve.interpolate = this.selection.curves[0].interpolate;
        curve.selection = this.selection;
        this.selection.curves.push(curve);
    }
}

export const ActivityCurvesStep:VisConfigStep = {
    icon: faChartLine,
    stepComponent: ActivityCurvesStepComponent,
    controlComponent: ActivityCurvesControlComponent
}