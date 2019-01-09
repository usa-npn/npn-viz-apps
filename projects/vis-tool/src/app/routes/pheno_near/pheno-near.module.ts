import { NgModule } from "@angular/core";

import { MaterialModule } from '../../material';

import { PhenoNearComponent } from './pheno-near.component';

@NgModule({
    imports: [
        MaterialModule
    ],
    declarations: [
        PhenoNearComponent
    ],
    exports: [
        PhenoNearComponent
    ]
})
export class PhenoNearModule {}