import { NgModule } from "@angular/core";

import { MaterialModule } from '../../material';
import { NpnCommonModule } from "@npn/common";

import { StepIconComponent } from './step-icon.component';
import { ShareControlComponent } from './share-control.component';
import { ExplorePhenoComponent } from './explore-pheno.component';
import { StepControlsModule } from './step_controls';

import { SharingService } from './sharing.service';
import { ResetControlComponent } from './reset-control.component';

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
        ExplorePhenoComponent
    ],
    exports: [
        ExplorePhenoComponent
    ],
    providers: [
        SharingService
    ]
})
export class ExplorePhenoModule {}