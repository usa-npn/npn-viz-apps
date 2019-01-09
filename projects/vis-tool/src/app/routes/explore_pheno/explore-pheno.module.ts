import { NgModule } from "@angular/core";

import { MaterialModule } from '../../material';

import { ExplorePhenoComponent } from './explore-pheno.component';
import { MenuModule } from './menu';
import { StepControlsModule } from './step_controls';
import { StepHost, ControlHost } from './step-hosts';

@NgModule({
    imports: [
        MaterialModule,
        StepControlsModule,
        MenuModule
    ],
    declarations: [
        StepHost, ControlHost,
        ExplorePhenoComponent
    ],
    exports: [
        ExplorePhenoComponent
    ]
})
export class ExplorePhenoModule {}