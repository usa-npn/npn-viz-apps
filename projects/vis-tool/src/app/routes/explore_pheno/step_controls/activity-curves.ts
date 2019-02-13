import { BaseStepComponent, BaseControlComponent } from './base';
import { Component, ViewEncapsulation } from '@angular/core';
import { ActivityCurvesSelection } from '@npn/common';
import { VisConfigStep, StepState } from '../interfaces';
import { faChartLine } from '@fortawesome/pro-light-svg-icons';

@Component({
    template: `
    <div *ngFor="let c of selection.curves; index as i">
        <div *ngIf="c.isValid()" class="curve curve-{{i}}"
            [ngStyle]="{'border-left-color':c.color}">
            <div>{{c.species | speciesTitle}}</div>
            <div>{{c.phenophase.phenophase_name}}</div>
            <div>{{c.year}}</div>
            <div>{{c.metric.label}}</div>
        </div>
    </div>
    `,
    styles:[`
    .curve {
        border-left-style: solid;
        border-left-width: 3px;
        padding-left: 5px;
    }
    .curve-0 {
        margin-bottom: 5px;
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
    <div class="curves">
        <div class="curve one" *ngIf="selection.curves?.length > 0">
            <label [ngStyle]="{'color': selection.curves[0].color}">Curve 1</label>
            <curve-selection-control [selection]="selection" [curve]="selection.curves[0]"></curve-selection-control>
        </div>
        <div class="curve two" *ngIf="selection.curves?.length > 1">
            <label [ngStyle]="{'color': selection.curves[1].color}">Curve 2</label>
            <curve-selection-control [selection]="selection"  [curve]="selection.curves[1]" [disabled]="!selection.curves[0].isValid()" [required]="false"></curve-selection-control>
        </div>
    </div>
    `,
    encapsulation: ViewEncapsulation.None,
    styles:[`
    .curves {
        min-width: 275px;
    }
    .curves,
    .curve,
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
    `]
})
export class ActivityCurvesControlComponent extends BaseControlComponent {
    title:string = 'Select activity curves';
    selection: ActivityCurvesSelection;
    protected defaultPropertyKeys:string[] = ['curves'];

}

export const ActivityCurvesStep:VisConfigStep = {
    icon: faChartLine,
    stepComponent: ActivityCurvesStepComponent,
    controlComponent: ActivityCurvesControlComponent
}