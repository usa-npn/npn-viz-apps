import { Component } from "@angular/core";

import { Subject } from 'rxjs';

import { StartEndStep } from './start-end';
import { YearsStep } from './years';

import {
    faChartLine,
    faMapMarker,
    faChartNetwork,
    faCalendarAlt,
    faClock
} from '@fortawesome/pro-light-svg-icons';

import { VisConfigStep, VisDefinition, StepComponent, StepState, ControlComponent } from "../interfaces";
import { VisualizationSelectionFactory, ScatterPlotComponent, VisSelection, CalendarComponent, MapVisualizationComponent, MonitorsDestroy, ActivityCurvesComponent, AgddTimeSeriesComponent, STATIC_COLORS, ActivityCurvesSelection, ActivityCurve, StationAwareVisSelection } from "@npn/common";
import { StartEndSpeciesPhenoColorStep, YearsSpeciesPhenoColorStep } from "./species-pheno-color";
import { ScatterPlotMiscStep } from "./scatter-plot-misc";
import { CalendarMiscStep } from './calendar-misc';
import { ActivatedRoute } from '@angular/router';
import { takeUntil, map, filter } from 'rxjs/operators';
import { SharingService, Shared } from '../sharing.service';
import { MapLayerStep } from './map-layer';
import { ActivityCurvesStep } from './activity-curves';
import { ActivityCurvesMiscStep } from './activity-curves-misc';
import { MapYearStep } from './map-year';
import { MapSpeciesPhenoStep } from './map-species-phenophase';
import { AgddTsLayerPointStep } from './agdd-ts-layer-point';
import { AgddTsMiscStep } from './agdd-ts-misc';
import { BoundaryStep } from "./boundary";
import { MapMiscStep } from './map-misc';

let PERSON_ID;
let GROUP_ID;

/**
 * This function is exported to allow the UI reset functionality to put a definition
 * back in its initial "clean" state.  If it has what it needs it will unconditionally
 * create a new selection and clean out any selection specific properties,
 * 
 * @param visDef The visualization definition.
 * @param selectionFactory Factory for constructing new empty selections.
 */
export function resetVisDefinition(visDef:VisDefinition,selectionFactory:VisualizationSelectionFactory) {
    if(typeof(visDef.selection) === 'string' || !!visDef.templateSelection) {
        const $class = !!visDef.templateSelection
            ? visDef.templateSelection.$class
            : visDef.selection; // string
        // always recreate template
        visDef.templateSelection = selectionFactory.newSelection({$class});
        if(visDef.initializeTemplateSelection) {
            visDef.initializeTemplateSelection(visDef.templateSelection);
        }
        visDef.selection = selectionFactory.newSelection({$class});
        if(PERSON_ID && visDef.selection instanceof StationAwareVisSelection) {
            visDef.selection.personId = PERSON_ID;
        }
        if(GROUP_ID && visDef.selection instanceof StationAwareVisSelection) {
            visDef.selection.groupId = GROUP_ID;
        }
        const externalTemplate = visDef.templateSelection.external;
        Object.keys(externalTemplate)
            .filter(k => ['guid','meta','$class','personId'].indexOf(k) === -1)
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
}

export function clearPersonalized(selectionFactory:VisualizationSelectionFactory,skip?:VisSelection) {
    PERSON_ID = undefined;
    GROUP_ID = undefined;
    VIS_DEFINITIONS
        .filter(visDef => skip != visDef.selection)
        .forEach(visDef => resetVisDefinition(visDef,selectionFactory));
}

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
    selection?;

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
    </div>
    `
})
export class VisSelectionControlComponent extends MonitorsDestroy implements ControlComponent {
    title:string = 'Select visualization';
    selection:VisSelectionSelection;

    definitions:VisDefinition[] = VIS_DEFINITIONS;

    constructor(
        private selectionFactory:VisualizationSelectionFactory,
        private activatedRoute:ActivatedRoute,
        private sharingService:SharingService
    ) {
        super();
    }

    ngOnInit() {
        VIS_DEFINITIONS
            .filter(visDef => !visDef.templateSelection) // only reset those that don't have templates
            .forEach(visDef => resetVisDefinition(visDef,this.selectionFactory));
        // so we know whether we do or don't have a person id.
        this.activatedRoute.paramMap
            .pipe(
                map(pm => ({
                    s: pm.get('s'),
                    personId: pm.get('person_id'),
                    groupId: pm.get('group_id')
                })),
                takeUntil(this.componentDestroyed)
            )
            .subscribe(input => {
                console.log('url parameter input',input);
                const {s,personId,groupId} = input;
                if(personId) {
                    console.log('HAVE PERSON ID',personId);
                    PERSON_ID = personId;
                }
                if(groupId) {
                    console.log('HAVE GROUP ID',groupId);
                    GROUP_ID = groupId;
                }
                if(personId || groupId) {
                    VIS_DEFINITIONS.forEach(visDef => resetVisDefinition(visDef,this.selectionFactory));
                }

                if(s) {
                    const shared:Shared = this.sharingService.deserialize(s);
                    const selection:VisSelection = this.selectionFactory.newSelection(shared.external);
                    selection.$shared = shared;
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
                }
            });
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
            MapLayerStep,
            BoundaryStep,
            MapYearStep,
            MapSpeciesPhenoStep,
            MapMiscStep
        ]
    },
    {
        title: 'Scatter plot',
        icon: faChartNetwork,
        selection: 'ScatterPlotSelection',
        component: ScatterPlotComponent,
        steps:[
            BoundaryStep,
            StartEndStep,
            StartEndSpeciesPhenoColorStep,
            ScatterPlotMiscStep
        ]
    },
    {
        title: 'Activity curve',
        icon: faChartLine,
        selection: 'ActivityCurvesSelection',
        component: ActivityCurvesComponent,
        initializeTemplateSelection(selection:ActivityCurvesSelection) {
            const curve0 = new ActivityCurve();
            curve0.color = STATIC_COLORS[0];
            curve0.id = 0;
            selection.curves = [curve0];
        },
        steps:[
            BoundaryStep,
            ActivityCurvesStep,
            ActivityCurvesMiscStep
        ]
    },
    {
        title: 'Calendar',
        icon: faCalendarAlt,
        selection: 'CalendarSelection',
        component: CalendarComponent,
        steps:[
            BoundaryStep,
            YearsStep,
            YearsSpeciesPhenoColorStep,
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