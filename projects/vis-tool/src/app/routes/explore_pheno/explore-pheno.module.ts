import { NgModule } from "@angular/core";

import { MaterialModule } from '../../material';

import { StepIconComponent } from './step-icon.component';
import { ExplorePhenoComponent } from './explore-pheno.component';
import { StepControlsModule } from './step_controls';
import { StepHost, ControlHost } from './step-hosts';

@NgModule({
    imports: [
        MaterialModule,
        StepControlsModule
    ],
    declarations: [
        StepHost, ControlHost,
        StepIconComponent,
        ExplorePhenoComponent
    ],
    exports: [
        ExplorePhenoComponent
    ]
})
export class ExplorePhenoModule {}