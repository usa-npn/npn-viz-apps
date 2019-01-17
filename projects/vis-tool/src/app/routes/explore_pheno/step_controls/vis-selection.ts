import { Component } from "@angular/core";

import { Subject } from 'rxjs';

import { StartEndStep } from './start-end';
import { YearsStep } from './years';

import {
    faChartLine,
    faMapMarker,
    faChartNetwork,
    faCalendarAlt,
    faThermometerHalf,
    faInfoCircle
} from '@fortawesome/pro-light-svg-icons';

import { VisConfigStep, VisDefinition, StepComponent, StepState, ControlComponent } from "../interfaces";
import { VisualizationSelectionFactory, ScatterPlotComponent, VisSelection, CalendarComponent } from "@npn/common";
import { StartEndLegacySpeciesPhenoColorStep, YearsLegacySpeciesPhenoColorStep } from "./legacy-species-pheno-color";
import { ScatterPlotMiscStep } from "./scatter-plot-misc";
import { CalendarMiscStep } from './calendar-misc';
import { LocationStep } from './location';

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
    title:string = 'Visualization type';
    state:StepState;

    stepVisit() {
        this.state = StepState.AVAILABLE;
    }

    stepDepart() {
        this.state = StepState.COMPLETE; // if not on this step it means we've picked a visualization.
    }
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
    title:string = 'Select visualization';
    selection:VisSelectionSelection;
    infoIcon = faInfoCircle;

    categories:any[] = [{
        title: 'maps',
        defs: MAPS
    },{
        title: 'charts',
        defs: CHARTS
    }];

    private readyResolver:Function;
    private ready:Promise<void> = new Promise(resolve => this.readyResolver = resolve);

    constructor(private selectionFactory:VisualizationSelectionFactory) {}

    ngOnInit() {
        console.warn('VisSelectionControlComponent.ngOnInit');
        [...MAPS,...CHARTS].forEach(visDef => {
            if(typeof(visDef.selection) === 'string') {
                visDef.templateSelection = this.selectionFactory.newSelection({$class:visDef.selection});
                visDef.selection = this.selectionFactory.newSelection({$class:visDef.selection});
                const externalTemplate = visDef.templateSelection.external;
                Object.keys(externalTemplate)
                    .filter(k => ['guid','meta','$class'].indexOf(k) === -1)
                    .forEach(key => {
                        const val = visDef.selection[key];
                        if(val !== null) {
                            // leave empty arrays alone
                            if(!Array.isArray(val) || val.length) {
                                visDef.selection[key] = undefined;
                            }
                        }
                    });
                console.log('template',visDef.templateSelection);
                console.log('selection',visDef.selection);
            }
        });
        this.readyResolver();
    }

    setVisSelection(selection:VisSelection):Promise<boolean> {
        return this.ready
            .then(() => {
                const visDef = [...MAPS,...CHARTS].find(vd => vd.selection && selection.$class === vd.selection.$class);
                console.log('setVisSelection:visDef',visDef);
                if(visDef) {
                    visDef.selection = selection;
                    this.selection.selected = visDef;
                    return true;
                }
                return false;
            });
    }
}

export const VisSelectionStep:VisConfigStep = {
    icon: faChartLine,
    stepComponent: VisSelectionStepComponent,
    controlComponent: VisSelectionControlComponent
};

const DEV_SELECTION = {
    isValid: () => false
};

const MAPS:VisDefinition[] = [{
    title: 'Map',
    icon: faMapMarker,
    steps:[LocationStep],
    selection: DEV_SELECTION,
    templateSelection: {},
},{
    title: 'Spring onset',
    icon: faThermometerHalf,
    selection: DEV_SELECTION,
    templateSelection: {},
}];

const CHARTS:VisDefinition[] = [{
    title: 'Scatter plot',
    icon: faChartNetwork,
    selection: 'ScatterPlotSelection',
    steps:[
        StartEndStep,
        StartEndLegacySpeciesPhenoColorStep,
        ScatterPlotMiscStep
    ],
    component: ScatterPlotComponent
},{
    title: 'Activity curve',
    icon: faChartLine,
    selection: DEV_SELECTION,
    templateSelection: {},
},{
    title: 'Calendar',
    icon: faCalendarAlt,
    selection: 'CalendarSelection',
    steps:[
        YearsStep,
        YearsLegacySpeciesPhenoColorStep,
        CalendarMiscStep
    ],
    component: CalendarComponent
}];