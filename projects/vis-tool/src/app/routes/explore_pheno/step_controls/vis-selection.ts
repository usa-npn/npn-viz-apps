import { Component } from "@angular/core";

import { Subject } from 'rxjs';

import { StartEndStep } from './start-end';

import {
    faChartLine,
    faMapMarker,
    faChartNetwork,
    faCalendarAlt,
    faThermometerHalf,
    faInfoCircle
} from '@fortawesome/pro-light-svg-icons';

import { StepComponent, ControlComponent, VisConfigStep, VisDefinition } from "../interfaces";
import { VisualizationSelectionFactory, ScatterPlotComponent } from "@npn/common";
import { LegacySpeciesPhenoColorStep } from "./legacy-species-pheno-color";
import { ScatterPlotMiscStep } from "./scatter-plot-misc";

export class VisSelectionSelection {
    changes:Subject<VisDefinition> = new Subject();

    private _selected:VisDefinition;
    get selected():VisDefinition { return this._selected; }
    set selected(s:VisDefinition) { this.changes.next(this._selected = s); }
}

@Component({
    template: `{{selection?.selected?.title}}`
})
export class VisSelectionStepComponent implements StepComponent {
}

@Component({
    template: `
    <div>
        <div *ngFor="let cat of categories">
            <h4>{{cat.title}}</h4>
            <div class="vis-selectors" *ngFor="let v of cat.defs">
                <button mat-raised-button (click)="selection.selected = v;" [color]="selection.selected === v ? 'accent' : null" [ngClass]="{selected: selection.selected === v}">
                    <fa-icon [icon]="v.icon"></fa-icon> {{v.title}}
                </button>
                <div class="info"><fa-icon [icon]="infoIcon"></fa-icon></div>
            </div>
        </div>
    </div>
    `
})
export class VisSelectionControlComponent implements ControlComponent {
    infoIcon = faInfoCircle;

    categories:any[] = [{
        title: 'maps',
        defs: MAPS
    },{
        title: 'charts',
        defs: CHARTS
    }]

    constructor(private selectionFactory:VisualizationSelectionFactory) {}

    ngOnInit() {
        [...MAPS,...CHARTS].forEach(visDef => {
            if(typeof(visDef.selection) === 'string') {
                visDef.selection = this.selectionFactory.newSelection({$class:visDef.selection});
            }
        });
    }
}

export const VisSelectionStep:VisConfigStep = {
    title: 'Visualization type',
    controlTitle: 'Select visualization',
    icon: faChartLine,
    stepComponent: VisSelectionStepComponent,
    controlComponent: VisSelectionControlComponent
};

const MAPS:VisDefinition[] = [{
    title: 'Map',
    icon: faMapMarker,
    steps:[StartEndStep],
    selection: {},
},{
    title: 'Spring onset',
    icon: faThermometerHalf,
    selection: {},
}];

const CHARTS:VisDefinition[] = [{
    title: 'Scatter plot',
    icon: faChartNetwork,
    selection: 'ScatterPlotSelection',
    steps:[
        StartEndStep,
        LegacySpeciesPhenoColorStep,
        ScatterPlotMiscStep
    ],
    component: ScatterPlotComponent
},{
    title: 'Activity curve',
    icon: faChartLine,
    selection: {},
},{
    title: 'Calendar',
    icon: faCalendarAlt,
    selection: {},
}];