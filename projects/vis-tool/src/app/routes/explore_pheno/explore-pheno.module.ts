import { NgModule } from "@angular/core";

import { MaterialModule } from '../../material';

import { StepIconComponent } from './step-icon.component';
import { ExplorePhenoComponent } from './explore-pheno.component';
import { StepControlsModule } from './step_controls';

@NgModule({
    imports: [
        MaterialModule,
        StepControlsModule
    ],
    declarations: [
        StepIconComponent,
        ExplorePhenoComponent
    ],
    exports: [
        ExplorePhenoComponent
    ]
})
export class ExplorePhenoModule {}