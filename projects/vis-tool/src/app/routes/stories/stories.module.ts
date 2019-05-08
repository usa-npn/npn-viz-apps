import { NgModule } from "@angular/core";

import { MaterialModule } from '../../material';

import { StoriesComponent } from './stories.component';
import { HttpClientModule } from '@angular/common/http';
import { GeocodeZipComponent } from './geocode-zip.component';
import { FormsModule } from '@angular/forms';

@NgModule({
    imports: [
        MaterialModule,
        HttpClientModule
    ],
    declarations: [
        StoriesComponent,
        GeocodeZipComponent
    ],
    exports: [
        StoriesComponent
    ]
})
export class PhenoNearModule {}