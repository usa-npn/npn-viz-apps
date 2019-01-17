import { NgModule } from "@angular/core";

import { MaterialModule } from '../../../material';
import {
    VisualizationsModule,
    NpnCommonModule,
    ScatterPlotComponent,
    CalendarComponent } from '@npn/common';

import { VisSelectionControlComponent, VisSelectionStepComponent } from './vis-selection';
import { DummyStepComponent, DummyControlComponent } from './dummy';
import { StartEndControlComponent, StartEndStepComponent } from './start-end';
import { YearsControlComponent, YearsStepComponent } from './years';
import { LocationStepComponent, LocationControlComponent, LocationControlSubComponent } from './location';

import { ScatterPlotMiscStepComponent, ScatterPlotMiscControlComponent } from './scatter-plot-misc';
import { CalendarMiscStepComponent, CalendarMiscControlComponent } from './calendar-misc';
import { StartEndLegacySpeciesPhenoColorStepComponent, YearsLegacySpeciesPhenoColorStepComponent, LegacySpeciesPhenoColorControlComponent } from './legacy-species-pheno-color';

// all of the components of this module have to be entryComponents
// since they are all dynamically inserted into the application.
// rather than cut/pasting everythign just define the list once
const COMPONENTS:any[] = [
    VisSelectionControlComponent, VisSelectionStepComponent,
    DummyStepComponent, DummyControlComponent,
    StartEndControlComponent, StartEndStepComponent,
    YearsControlComponent, YearsStepComponent,
    LocationStepComponent, LocationControlComponent, LocationControlSubComponent,

    ScatterPlotMiscStepComponent, ScatterPlotMiscControlComponent,
    CalendarMiscStepComponent, CalendarMiscControlComponent,

    StartEndLegacySpeciesPhenoColorStepComponent,  YearsLegacySpeciesPhenoColorStepComponent, LegacySpeciesPhenoColorControlComponent
];
const ENTRY_COMPONENTS:any[] = [
    ...COMPONENTS,
    ScatterPlotComponent,
    CalendarComponent
];

@NgModule({
    imports: [
        MaterialModule,
        VisualizationsModule,
        NpnCommonModule
    ],
    declarations: COMPONENTS,
    entryComponents: ENTRY_COMPONENTS
})
export class StepControlsModule {}