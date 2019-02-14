import { BaseStepComponent, BaseControlComponent } from './base';
import { Component, ViewEncapsulation } from '@angular/core';
import { StepState, VisConfigStep } from '../interfaces';
import { MapSelection, MAP_VIS_SVG_PATHS } from '@npn/common';
import { faCrow } from '@fortawesome/pro-light-svg-icons';

@Component({
    template: `
    <div *ngFor="let plot of selection.validPlots; index as i" class="plot">
        <svg class="icon" viewBox="0 0 22 22">
            <path fill="steelblue" [attr.d]="iconPaths[i]"></path>
        </svg>
        <div class="title">{{plot.species | speciesTitle}}<span *ngIf="plot.phenophase?.phenophase_name">/{{plot.phenophase.phenophase_name}}</span></div>
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
        return this.selection.validPlots.length
            ? StepState.COMPLETE
            : StepState.AVAILABLE;
    }
}

@Component({
    template: `
    <div class="phenophase-input-wrapper" *ngFor="let spi of selection.plots; index as idx">
        <species-phenophase-input
            [(species)]="spi.species" [(phenophase)]="spi.phenophase"
            [selection]="selection"
            [gatherColor]="false"
            (onSpeciesChange)="selection.update()"
            (onPhenophaseChange)="selection.update()"></species-phenophase-input>
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
export class MapSpeciesPhenoControlComponent extends BaseControlComponent {
    title:string = 'Select species phenophase';
    selection:MapSelection;

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
}

export const MapSpeciesPhenoStep:VisConfigStep = {
    icon: faCrow,
    stepComponent: MapSpeciesPhenoStepComponent,
    controlComponent: MapSpeciesPhenoControlComponent
}