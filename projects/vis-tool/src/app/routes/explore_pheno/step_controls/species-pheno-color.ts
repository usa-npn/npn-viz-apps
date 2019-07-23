import { VisConfigStep, StepState } from "../interfaces";

import { faCrow } from '@fortawesome/pro-light-svg-icons';
import { Component, ViewEncapsulation } from "@angular/core";
import { ScatterPlotSelection } from "@npn/common";
import { BaseStepComponent, BaseControlComponent } from "./base";
// TODO ? export from @npn/common
import { ObservationDateVisSelection } from '@npn/common/visualizations/observation-date-vis-selection';

const CONTROL_TITLE = 'Select species phenophase';
const STEP_TEMPLATE = `
<div *ngFor="let plot of selection.plots" class="plot">
    <div class="swatch" [ngStyle]="{'background-color':plot.color}"></div>
    <div class="title">{{plot.species | taxonomicSpeciesTitle:plot.speciesRank}}<span *ngIf="plot.phenophase">/{{plot.phenophase.phenophase_name||plot.phenophase.pheno_class_name}}</span></div>
</div>
`;
const STEP_STYLES = `
:host {
    display: flex;
    flex-direction: column;
}
.plot {
    display :flex;
    flex-direction: row;
    padding-bottom: 5px;
}
.swatch {
    width: 20px;
    height: 20px;
}
.title {
    padding-left: 5px;
}
`;

@Component({
    template: STEP_TEMPLATE,
    styles:[STEP_STYLES]
})
export class StartEndSpeciesPhenoColorStepComponent extends BaseStepComponent {
    title:string = 'Species/Phenophase';
    selection: ScatterPlotSelection;

    get state():StepState {
        return this.selection.validPlots.length
            ? StepState.COMPLETE
            : this.selection.start && this.selection.end
                ? StepState.AVAILABLE
                : StepState.UNAVAILABLE;
    }
}

@Component({
    template: STEP_TEMPLATE,
    styles:[STEP_STYLES]
})
export class YearsSpeciesPhenoColorStepComponent extends BaseStepComponent {
    title:string = CONTROL_TITLE;
    selection: ObservationDateVisSelection;

    get state():StepState {
        return this.selection.validPlots.length
            ? StepState.COMPLETE
            : this.selection.years && this.selection.years.length
                ? StepState.AVAILABLE
                : StepState.UNAVAILABLE;
    }
}

@Component({
    template: `
    <mat-expansion-panel  *ngFor="let plot of selection.plots; index as idx" expanded="true" class="control-expansion-panel">
        <mat-expansion-panel-header>
            <mat-panel-title>
                Plot #{{idx+1}}
            </mat-panel-title>
        </mat-expansion-panel-header>
        <div class="phenophase-input-wrapper">
            <higher-species-phenophase-input
                    [selection]="selection"
                    [plot]="plot"
                    gatherColor="true"
                    (plotChange)="selection.update()">
            </higher-species-phenophase-input>
            <div class="action-holder">
                <button *ngIf="idx > 0 || selection.plots.length > 1" mat-button class="remove-plot" (click)="removePlot(idx)">Remove</button>
            </div>
        </div>
    </mat-expansion-panel>
    <div class="action-holder">
        <button mat-button class="add-plot" [disabled]="selection.plots.length === 3 || !plotsValid()" (click)="addPlot()">Add</button>
    </div>
    `,
    styles:[`
    .control-expansion-panel {
        min-width: 300px;
    }
    .phenophase-input-wrapper,
    higher-species-phenophase-input {
        display: flex;
        flex-direction: column;
        align-items: stretch;
    }
    higher-species-phenophase-input>*:not(.color-input) {
        width: inherit !important;
    }
    .action-holder {
        margin: 10px 0px;
        text-align: right;
    }
    `],
    encapsulation: ViewEncapsulation.None
})
export class SpeciesPhenoColorControlComponent extends BaseControlComponent {
    title:string = CONTROL_TITLE;
    selection: any; //(ScatterPlotSelection|ObservationDateVisSelection);

    ngOnInit() {
        if(this.selection.plots.length === 0) {
            this.addPlot();
        }
    }

    redrawChange(change?) {
        if(change && !change.oldValue && change.newValue) { // e.g. no color to a color means a plot that wasn't valid is now potentially valid.
            this.selection.update();
        } else {
            this.selection.redraw(); // will update if necessary
        }
    }

    addPlot() {
        const plots:any[] = this.selection.plots;
        plots.push({});
    }

    removePlot(index:number) {
        const plots:any[] = this.selection.plots;
        plots.splice(index,1);
        this.selection.update();
    }

    plotsValid() {
        return this.selection.plots.length === this.selection.validPlots.length;
    }
}

export const StartEndSpeciesPhenoColorStep:VisConfigStep = {
    icon: faCrow,
    stepComponent: StartEndSpeciesPhenoColorStepComponent,
    controlComponent: SpeciesPhenoColorControlComponent
};

export const YearsSpeciesPhenoColorStep:VisConfigStep = {
    icon: faCrow,
    stepComponent: YearsSpeciesPhenoColorStepComponent,
    controlComponent: SpeciesPhenoColorControlComponent
};