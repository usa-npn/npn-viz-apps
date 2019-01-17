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
    <div class="title">{{plot.species | speciesTitle}}<span *ngIf="plot.phenophase?.phenophase_name">/{{plot.phenophase.phenophase_name}}</span></div>
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
export class StartEndLegacySpeciesPhenoColorStepComponent extends BaseStepComponent {
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
export class YearsLegacySpeciesPhenoColorStepComponent extends BaseStepComponent {
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
    <div class="phenophase-input-wrapper" *ngFor="let spi of selection.plots; index as idx">
        <species-phenophase-input
            [(species)]="spi.species" [(phenophase)]="spi.phenophase" [(color)]="spi.color"
            [selection]="selection"
            [gatherColor]="true"
            (onSpeciesChange)="selection.update()"
            (onPhenophaseChange)="selection.update()"
            (onColorChange)="redrawChange($event)"></species-phenophase-input>
        <div class="buttons">
            <button *ngIf="idx > 0" mat-button class="remove-plot" (click)="removePlot(idx)">Remove</button>
            <button *ngIf="selection.plots.length < 3 && idx === (selection.plots.length-1)" mat-button class="add-plot" [disabled]="!plotsValid()" (click)="addPlot()">Add</button>
        </div>
    </div>
    `,
    styles:[`
    .phenophase-input-wrapper,
    species-phenophase-input {
        display: flex;
        flex-direction: column;
        align-items: stretch;
    }
    species-phenophase-input>* {
        width: inherit !important;
    }
    .buttons {
        display:flex;
        justify-content: flex-end;
    }
    `],
    encapsulation: ViewEncapsulation.None
})
export class LegacySpeciesPhenoColorControlComponent extends BaseControlComponent {
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

export const StartEndLegacySpeciesPhenoColorStep:VisConfigStep = {
    icon: faCrow,
    stepComponent: StartEndLegacySpeciesPhenoColorStepComponent,
    controlComponent: LegacySpeciesPhenoColorControlComponent
};

export const YearsLegacySpeciesPhenoColorStep:VisConfigStep = {
    icon: faCrow,
    stepComponent: YearsLegacySpeciesPhenoColorStepComponent,
    controlComponent: LegacySpeciesPhenoColorControlComponent
};