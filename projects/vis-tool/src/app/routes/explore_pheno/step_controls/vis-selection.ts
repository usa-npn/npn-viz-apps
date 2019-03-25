import { Component } from "@angular/core";

import { Subject } from 'rxjs';

import { StartEndStep } from './start-end';
import { YearsStep } from './years';

import {
    faChartLine,
    faMapMarker,
    faChartNetwork,
    faCalendarAlt,
    faInfoCircle,
    faClock
} from '@fortawesome/pro-light-svg-icons';

import { VisConfigStep, VisDefinition, StepComponent, StepState, ControlComponent } from "../interfaces";
import { VisualizationSelectionFactory, ScatterPlotComponent, VisSelection, CalendarComponent, MapVisualizationComponent, MonitorsDestroy, ActivityCurvesComponent, AgddTimeSeriesComponent } from "@npn/common";
import { StartEndLegacySpeciesPhenoColorStep, YearsLegacySpeciesPhenoColorStep } from "./legacy-species-pheno-color";
import { ScatterPlotMiscStep } from "./scatter-plot-misc";
import { CalendarMiscStep } from './calendar-misc';
import { LocationStep } from './location';
import { ActivatedRoute } from '@angular/router';
import { takeUntil, map, filter } from 'rxjs/operators';
import { SharingService } from '../sharing.service';
import { MapLayerStep } from './map-layer';
import { ActivityCurvesStep } from './activity-curves';
import { ActivityCurvesMiscStep } from './activity-curves-misc';
import { MapYearStep } from './map-year';
import { MapSpeciesPhenoStep } from './map-species-phenophase';
import { AgddTsLayerPointStep } from './agdd-ts-layer-point';
import { AgddTsMiscStep } from './agdd-ts-misc';
import { BoundaryStep } from "./boundary";

export class VisSelectionSelection {
    changes:Subject<VisDefinition> = new Subject();
    changeDueToSharing:boolean = false;

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
    <div class="vis-selectors" *ngFor="let v of definitions">
        <button mat-raised-button (click)="selection.selected = v;" [color]="selection.selected === v ? 'accent' : null" [ngClass]="{selected: selection.selected === v}">
            <fa-icon [icon]="v.icon"></fa-icon> {{v.title}}
        </button>
        <div class="info"><fa-icon [icon]="infoIcon"></fa-icon></div>
    </div>
    `
})
export class VisSelectionControlComponent extends MonitorsDestroy implements ControlComponent {
    title:string = 'Select visualization';
    selection:VisSelectionSelection;
    infoIcon = faInfoCircle;

    definitions:VisDefinition[] = VIS_DEFINITIONS;

    constructor(
        private selectionFactory:VisualizationSelectionFactory,
        private activatedRoute:ActivatedRoute,
        private sharingService:SharingService
    ) {
        super();
    }

    ngOnInit() {
        VIS_DEFINITIONS.forEach(visDef => {
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
        // if when loaded there is a selection on the current route then wire it up
        this.activatedRoute.paramMap
            .pipe(
                map(pm => pm.get('s')),
                filter(s => !!s),
                takeUntil(this.componentDestroyed)
            )
            .subscribe(s => {
                const selection:VisSelection = this.sharingService.deserialize(s);
                selection.$shared = true;
                // find the corresponding definition
                const visDef = VIS_DEFINITIONS.find(vd => vd.selection && selection.$class === vd.selection.$class);
                if(visDef) {
                    visDef.selection = selection;
                    setTimeout(() => {
                        this.selection.changeDueToSharing = true;
                        this.selection.selected = visDef;
                    });
                } else {
                    console.warn('Unable to find visualization for selection',selection);
                }
            })
    }
}

export const VisSelectionStep:VisConfigStep = {
    icon: faChartLine,
    stepComponent: VisSelectionStepComponent,
    controlComponent: VisSelectionControlComponent
};

const VIS_DEFINITIONS:VisDefinition[] = [
    {
        title: 'Map',
        icon: faMapMarker,
        fullScreen: true,
        selection: 'MapSelection',
        component: MapVisualizationComponent,
        steps:[
            BoundaryStep,
            MapLayerStep,
            MapYearStep,
            MapSpeciesPhenoStep
        ]
    },
    {
        title: 'Scatter plot',
        icon: faChartNetwork,
        selection: 'ScatterPlotSelection',
        component: ScatterPlotComponent,
        steps:[
            StartEndStep,
            StartEndLegacySpeciesPhenoColorStep,
            ScatterPlotMiscStep
        ]
    },
    {
        title: 'Activity curve',
        icon: faChartLine,
        selection: 'ActivityCurvesSelection',
        component: ActivityCurvesComponent,
        steps:[ActivityCurvesStep,ActivityCurvesMiscStep]
    },
    {
        title: 'Calendar',
        icon: faCalendarAlt,
        selection: 'CalendarSelection',
        component: CalendarComponent,
        steps:[
            YearsStep,
            YearsLegacySpeciesPhenoColorStep,
            CalendarMiscStep
        ]
    },
    {
        title: 'AGDD Time Series',
        icon: faClock,
        selection: 'AgddTimeSeriesSelection',
        component: AgddTimeSeriesComponent,
        steps: [
            AgddTsLayerPointStep,
            AgddTsMiscStep
        ]
    }
];