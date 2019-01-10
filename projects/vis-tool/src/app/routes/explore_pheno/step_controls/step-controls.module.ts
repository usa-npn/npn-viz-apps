import { NgModule } from "@angular/core";

import { MaterialModule } from '../../../material';
import {
    VisualizationsModule,
    NpnCommonModule,
    ScatterPlotComponent } from '@npn/common';

import { VisSelectionControlComponent, VisSelectionStepComponent } from './vis-selection';

import { StartEndControlComponent, StartEndStepComponent } from './start-end';

import { ScatterPlotMiscStepComponent, ScatterPlotMiscControlComponent } from './scatter-plot-misc';
import { LegacySpeciesPhenoColorStepComponent, LegacySpeciesPhenoColorControlComponent } from './legacy-species-pheno-color';

// all of the components of this module have to be entryComponents
// since they are all dynamically inserted into the application.
// rather than cut/pasting everythign just define the list once
const COMPONENTS:any[] = [
    VisSelectionControlComponent, VisSelectionStepComponent,
    StartEndControlComponent, StartEndStepComponent,

    ScatterPlotMiscStepComponent, ScatterPlotMiscControlComponent,

    LegacySpeciesPhenoColorStepComponent, LegacySpeciesPhenoColorControlComponent
];
const ENTRY_COMPONENTS:any[] = [
    ...COMPONENTS,
    ScatterPlotComponent
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