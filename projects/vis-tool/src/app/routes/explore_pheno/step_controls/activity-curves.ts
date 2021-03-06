import { BaseStepComponent, BaseControlComponent } from './base';
import { Component, ViewEncapsulation, QueryList, ViewChildren } from '@angular/core';
import { ActivityCurvesSelection, ActivityCurve, STATIC_COLORS, CurveControlComponent } from '@npn/common';
import { VisConfigStep, StepState } from '../interfaces';
import { faChartLine } from '@fortawesome/pro-light-svg-icons';

@Component({
    template: `
    <div class="curve" *ngFor="let c of selection.validCurves; index as i"
        [ngStyle]="{'border-left-color':c.color}">
        <div>{{c.species | taxonomicSpeciesTitle:c.speciesRank}}</div>
        <div>{{c.phenophase.phenophase_name||c.phenophase.pheno_class_name}}</div>
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
    <mat-expansion-panel  *ngFor="let curve of selection.curves; index as i" expanded="true" class="curve-expansion-panel">
        <mat-expansion-panel-header>
            <mat-panel-title>
                <label [ngStyle]="{'color': curve.color}">Curve #{{i+1}} <span *ngIf="!curve.isValid()">(incomplete)</span></label>
            </mat-panel-title>
        </mat-expansion-panel-header>
        <curve-selection-control
            [selection]="selection" 
            [curve]="curve"
            [required]="i === 0"
            [gatherColor]="true"
            (onSpeciesChange)="speciesMetricChange($event)"
            (onMetricChange)="speciesMetricChange($event)"
            ></curve-selection-control>
        <div class="action-holder" *ngIf="i > 0">
            <button mat-button (click)="removeCurve(i)">Remove curve</button>
        </div>
    </mat-expansion-panel>
    <div class="action-holder">
        <button mat-button [disabled]="!allValid" (click)="addCurve()">Add curve</button>
    </div>
    `,
    encapsulation: ViewEncapsulation.None,
    styles:[`
    .curve-expansion-panel {
        min-width: 300px;
    }
    curve-selection-control,
    higher-species-phenophase-input {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
    }
    higher-species-phenophase-input .species-input,
    higher-species-phenophase-input .phenophase-input,
    .metric-input
     {
        width: 100% !important;
    }
    .action-holder {
        margin: 10px 0px;
        text-align: right;
    }
    `]
})
export class ActivityCurvesControlComponent extends BaseControlComponent {
    title:string = 'Select activity curves';
    selection: ActivityCurvesSelection;
    protected defaultPropertyKeys:string[] = ['curves'];

    @ViewChildren(CurveControlComponent) curveControls:QueryList<CurveControlComponent>;

    ngOnInit() {
        setTimeout(() => this.speciesMetricChange());
    }

    stepVisit() {
        super.stepVisit();
        this.curveControls.forEach(control => control.updateCriteria());
    }

    get allValid():boolean {
        if(!this.selection.curves || this.selection.curves.length === 0) {
            return false;
        }
        return this.selection.curves.reduce((valid,c) => valid && c.isValid(), this.selection.curves[0].isValid());
    }

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

export const ActivityCurvesStep:VisConfigStep = {
    icon: faChartLine,
    stepComponent: ActivityCurvesStepComponent,
    controlComponent: ActivityCurvesControlComponent
}