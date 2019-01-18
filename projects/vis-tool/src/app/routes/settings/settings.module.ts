import { NgModule } from '@angular/core';
import { MaterialModule } from '../../material';
import { SettingsComponent } from './settings.component';

@NgModule({
    imports: [
        MaterialModule
    ],
    declarations: [
        SettingsComponent
    ],
    exports: [
        SettingsComponent
    ]
})
export class SettingsModule {}