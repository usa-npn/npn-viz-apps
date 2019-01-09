import { NgModule } from "@angular/core";

import { MaterialModule } from '../../../material';
import { VisualizationsModule } from '@npn/common';

import { VisSelectionControlComponent, VisSelectionStepComponent } from './vis-selection';

import { StartEndControlComponent, StartEndStepComponent } from './start-end';

@NgModule({
    imports: [
        MaterialModule,
        VisualizationsModule
    ],
    declarations: [
        VisSelectionControlComponent, VisSelectionStepComponent,
        StartEndControlComponent, StartEndStepComponent
    ],
    entryComponents:[
        VisSelectionControlComponent, VisSelectionStepComponent,
        StartEndControlComponent, StartEndStepComponent
    ]
})
export class StepControlsModule {}