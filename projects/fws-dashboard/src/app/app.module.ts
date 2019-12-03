import {BrowserModule} from '@angular/platform-browser';
import {NgModule,enableProdMode} from '@angular/core';
import {HttpClientModule} from '@angular/common/http';

import {NpnLibModule,NpnCommonModule,VisualizationsModule,NPN_BASE_HREF,NpnConfiguration,NPN_CONFIGURATION} from '@npn/common';

import {FocalSpeciesComponent} from './focal-species.component';
import {FindingsComponent} from './findings.component';
import {ResourcesComponent} from './resources.component';
import {FwsDashboardComponent} from './fws-dashboard.component';
import {NewVisualizationDialogComponent,NewVisualizationBuilderComponent,RefugeVisualizationScopeSelectionComponent} from './new-visualization-dialog.component';
import {EntityService} from './entity.service';

import {FormsModule,ReactiveFormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatCheckboxModule,MatGridListModule,MatCardModule,MatListModule,
        MatTooltipModule,MatSnackBarModule,MatDialogModule,MatStepperModule,
        MatButtonModule,MatRadioModule,MatProgressSpinnerModule,MatSelectModule,
        MatInputModule,MatFormFieldModule,MatTabsModule,MatButtonToggleModule} from '@angular/material';

import { FlexLayoutModule } from '@angular/flex-layout';

import {environment} from '../environments/environment';
import {AgmCoreModule} from '@agm/core';

import {DndModule} from 'ng2-dnd';

export function baseHrefFactory() {
        return window['npn_base_href'];
}
export function npnConfigurationFactory() {
        return window['npn_configuration'];
}

@NgModule({
  declarations: [
    FwsDashboardComponent,
    FocalSpeciesComponent,
    FindingsComponent,
    ResourcesComponent,
    NewVisualizationBuilderComponent,
    RefugeVisualizationScopeSelectionComponent,
    NewVisualizationDialogComponent
  ],
  entryComponents: [
      NewVisualizationDialogComponent
  ],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    NpnLibModule,
    VisualizationsModule,
    NpnCommonModule,
    HttpClientModule,
    FormsModule,ReactiveFormsModule,
    MatCheckboxModule,MatGridListModule,
    MatCardModule,MatListModule,
    MatTooltipModule,MatSnackBarModule,
    MatDialogModule,MatStepperModule,
    MatButtonModule,MatRadioModule,
    MatProgressSpinnerModule,MatSelectModule,
    MatInputModule,MatFormFieldModule,MatTabsModule,MatButtonToggleModule,
    FlexLayoutModule,
    AgmCoreModule.forRoot({
        apiKey: environment.googleMapsApiKey
    }),
    DndModule.forRoot()
  ],
  bootstrap: [FwsDashboardComponent],
  providers: [
      EntityService,
      {provide:NPN_BASE_HREF,useFactory:baseHrefFactory},
      {provide:NPN_CONFIGURATION,useFactory:npnConfigurationFactory}
  ]
})
export class AppModule { }
