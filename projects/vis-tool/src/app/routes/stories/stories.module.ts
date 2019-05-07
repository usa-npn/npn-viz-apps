import { NgModule } from "@angular/core";

import { MaterialModule } from '../../material';

import { StoriesComponent } from './stories.component';

@NgModule({
    imports: [
        MaterialModule
    ],
    declarations: [
        StoriesComponent
    ],
    exports: [
        StoriesComponent
    ]
})
export class PhenoNearModule {}