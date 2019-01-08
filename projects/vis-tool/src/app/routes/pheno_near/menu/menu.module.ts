import { NgModule } from "@angular/core";

import { MaterialModule } from '../../../material';

import { StepIconComponent } from './step-icon.component';

@NgModule({
    imports: [
        MaterialModule
    ],
    declarations: [
        StepIconComponent
    ],
    exports: [
        StepIconComponent
    ]
})
export class MenuModule {

}