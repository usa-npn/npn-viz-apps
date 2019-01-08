import { NgModule } from "@angular/core";

import { MaterialModule } from '../../material';

import { PhenoNearComponent } from './pheno-near.component';
import { MenuModule } from './menu';

@NgModule({
    imports: [
        MaterialModule,
        MenuModule
    ],
    declarations: [
        PhenoNearComponent
    ],
    exports: [
        PhenoNearComponent
    ]
})
export class PhenoNearModule {}