import { NgModule } from "@angular/core";

import { MaterialModule } from '../../../material';
import {
    VisualizationsModule,
    NpnCommonModule,
    NpnGriddedModule,
    ScatterPlotComponent,
    CalendarComponent,
    MapVisualizationComponent, 
    ActivityCurvesComponent,
    AgddTimeSeriesComponent } from '@npn/common';

import { VisSelectionControlComponent, VisSelectionStepComponent } from './vis-selection';
import { DummyStepComponent, DummyControlComponent } from './dummy';
import { StartEndControlComponent, StartEndStepComponent } from './start-end';
import { YearsControlComponent, YearsStepComponent } from './years';
import { LocationStepComponent, LocationControlComponent, LocationControlSubComponent } from './location';
import { LayerStepComponent, LayerControlComponent, LayerControlSubComponent } from './layer';
import { MapLayerStepComponent, MapLayerControlComponent } from './map-layer';
import { MapYearStepComponent, MapYearControlComponent } from './map-year';
import { MapSpeciesPhenoStepComponent, MapSpeciesPhenoControlComponent } from './map-species-phenophase';

import { ScatterPlotMiscStepComponent, ScatterPlotMiscControlComponent } from './scatter-plot-misc';
import { CalendarMiscStepComponent, CalendarMiscControlComponent } from './calendar-misc';
import { StartEndLegacySpeciesPhenoColorStepComponent, YearsLegacySpeciesPhenoColorStepComponent, LegacySpeciesPhenoColorControlComponent } from './legacy-species-pheno-color';

import { ActivityCurvesStepComponent, ActivityCurvesControlComponent } from './activity-curves';
import { ActivityCurvesMiscStepComponent, ActivityCurvesMiscControlComponent } from './activity-curves-misc';

// all of the components of this module have to be entryComponents
// since they are all dynamically inserted into the application.
// rather than cut/pasting everythign just define the list once
const COMPONENTS:any[] = [
    VisSelectionControlComponent, VisSelectionStepComponent,
    DummyStepComponent, DummyControlComponent,
    StartEndControlComponent, StartEndStepComponent,
    YearsControlComponent, YearsStepComponent,
    LocationStepComponent, LocationControlComponent, LocationControlSubComponent,
    LayerStepComponent, LayerControlComponent, LayerControlSubComponent,
    MapLayerStepComponent, MapLayerControlComponent,
    MapYearStepComponent, MapYearControlComponent,
    MapSpeciesPhenoStepComponent, MapSpeciesPhenoControlComponent,

    ScatterPlotMiscStepComponent, ScatterPlotMiscControlComponent,
    CalendarMiscStepComponent, CalendarMiscControlComponent,
    ActivityCurvesStepComponent, ActivityCurvesControlComponent,
    ActivityCurvesMiscStepComponent, ActivityCurvesMiscControlComponent,

    StartEndLegacySpeciesPhenoColorStepComponent,  YearsLegacySpeciesPhenoColorStepComponent, LegacySpeciesPhenoColorControlComponent
];
const ENTRY_COMPONENTS:any[] = [
    ...COMPONENTS,
    ScatterPlotComponent,
    CalendarComponent,
    MapVisualizationComponent,
    ActivityCurvesComponent,
    AgddTimeSeriesComponent
];

@NgModule({
    imports: [
        MaterialModule,
        VisualizationsModule,
        NpnCommonModule,
        NpnGriddedModule
    ],
    declarations: COMPONENTS,
    entryComponents: ENTRY_COMPONENTS
})
export class StepControlsModule {}