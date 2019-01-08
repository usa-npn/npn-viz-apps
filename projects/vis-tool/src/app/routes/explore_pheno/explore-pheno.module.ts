import { NgModule } from "@angular/core";

import { MaterialModule } from '../../material';

import { ExplorePhenoComponent } from './explore-pheno.component';

@NgModule({
    imports: [
        MaterialModule
    ],
    declarations: [
        ExplorePhenoComponent
    ],
    exports: [
        ExplorePhenoComponent
    ]
})
export class ExplorePhenoModule {}