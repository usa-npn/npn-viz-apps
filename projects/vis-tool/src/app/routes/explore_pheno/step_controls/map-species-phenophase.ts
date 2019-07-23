import { BaseStepComponent, BaseControlComponent } from './base';
import { Component, ViewEncapsulation } from '@angular/core';
import { StepState, VisConfigStep } from '../interfaces';
import { MapSelection, MAP_VIS_SVG_PATHS } from '@npn/common';
import { faCrow } from '@fortawesome/pro-light-svg-icons';

@Component({
    template: `
    <div *ngFor="let plot of selection.validPlots; index as i" class="plot">
        <svg class="icon" viewBox="0 0 22 22">
            <path [attr.d]="iconPaths[i]"></path>
        </svg>
        <div class="title">{{plot.species | taxonomicSpeciesTitle:plot.speciesRank}}<span *ngIf="plot.phenophase">/{{plot.phenophase.phenophase_name||plot.phenophase.pheno_class_name}}</span></div>
    </div>
    `,
    styles:[`
    :host {
        display: flex;
        flex-direction: column;
    }
    .plot {
        display :flex;
        flex-direction: row;
        align-items: center;
        padding-bottom: 5px;
    }
    .icon {
        width: 22px;
        height: 22px;
    }
    .title {
        padding-left: 5px;
    }
    `]

})
export class MapSpeciesPhenoStepComponent extends BaseStepComponent {
    title:string = 'Species/phenophase';
    selection:MapSelection;
    iconPaths = MAP_VIS_SVG_PATHS;

    get state():StepState {
        return !this.selection.year
            ? StepState.UNAVAILABLE
            : this.selection.validPlots.length
                ? StepState.COMPLETE
                : StepState.AVAILABLE;
    }
}

@Component({
    template: `
    <mat-expansion-panel  *ngFor="let plot of selection.plots; index as idx" expanded="true" class="species-pheno-expansion">
        <mat-expansion-panel-header>
            <mat-panel-title>
            <svg class="icon" viewBox="0 0 22 22"><path [attr.d]="iconPaths[idx]"></path></svg>
            Plot #{{idx+1}}
            </mat-panel-title>
        </mat-expansion-panel-header>
        <div class="phenophase-input-wrapper">
            <higher-species-phenophase-input
                [selection]="selection"
                [plot]="plot"
                (plotChange)="plotChange($event)">
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
    .species-pheno-expansion {
        min-width: 300px;
    }
    .phenophase-input-wrapper,
    higher-species-phenophase-input {
        display: flex;
        flex-direction: column;
        align-items: stretch;
    }
    higher-species-phenophase-input>* {
        width: inherit !important;
    }
    .action-holder {
        margin: 10px 0px;
        text-align: right;
    }
    .icon {
        width: 22px;
        height: 22px;
        fill: #68bd46;
        margin-right: 10px;
    }
    `],
    encapsulation: ViewEncapsulation.None
})
export class MapSpeciesPhenoControlComponent extends BaseControlComponent {
    title:string = 'Select species phenophase';
    selection:MapSelection;
    iconPaths = MAP_VIS_SVG_PATHS;

    ngOnInit() {
        if(this.selection.plots.length === 0) {
            this.addPlot();
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

    plotChange($event) {
        console.log('plotChange',$event);
        this.selection.update();
    }
}

export const MapSpeciesPhenoStep:VisConfigStep = {
    icon: faCrow,
    stepComponent: MapSpeciesPhenoStepComponent,
    controlComponent: MapSpeciesPhenoControlComponent
}