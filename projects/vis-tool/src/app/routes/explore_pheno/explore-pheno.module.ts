import { NgModule } from "@angular/core";

import { MaterialModule } from '../../material';
import { NpnCommonModule } from "@npn/common";

import { StepIconComponent } from './step-icon.component';
import { ShareControlComponent } from './share-control.component';
import { ExplorePhenoComponent } from './explore-pheno.component';
import { StepControlsModule } from './step_controls';

import { ResetControlComponent } from './reset-control.component';
import { ShareDescriptionComponent, SharedVisualizationDescriptionComponent } from './share-description.component';
import { ExportControlComponent } from './export-control.component';
import { PersonControlComponent } from './person-control.component';

@NgModule({
    imports: [
        MaterialModule,
        NpnCommonModule,
        StepControlsModule
    ],
    declarations: [
        StepIconComponent,
        ShareControlComponent,
        ResetControlComponent,
        ExplorePhenoComponent,
        ShareDescriptionComponent,
        SharedVisualizationDescriptionComponent,
        ExportControlComponent,
        PersonControlComponent
    ],
    exports: [
        ExplorePhenoComponent,
        SharedVisualizationDescriptionComponent
    ],
    entryComponents: [
        SharedVisualizationDescriptionComponent
    ]
})
export class ExplorePhenoModule {}