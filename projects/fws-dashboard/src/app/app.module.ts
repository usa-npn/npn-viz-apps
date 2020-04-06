import {BrowserModule} from '@angular/platform-browser';
import {NgModule,enableProdMode} from '@angular/core';
import {HttpClientModule} from '@angular/common/http';

import {NpnLibModule,NpnCommonModule,VisualizationsModule,NPN_BASE_HREF,NpnConfiguration,NPN_CONFIGURATION} from '@npn/common';

import {FocalSpeciesComponent} from './focal-species.component';
import {FindingsComponent} from './findings.component';
import {ResourcesComponent, SafeHtmlPipe} from './resources.component';
import {FwsDashboardComponent} from './fws-dashboard.component';
import {PhenologyTrailPartnersComponent} from './phenology-trail-partners.component';
import {NewVisualizationDialogComponent,NewVisualizationBuilderComponent} from './new-visualization-dialog.component';
import { RefugeVisualizationScopeSelectionComponent } from "./refuge-visualization-scope-selection.component";
import { PhenoTrailVisualizationScopeSelectionComponent } from './pheno-trail-visualization-scope-selection.component';
import { PhenoTrailVisualizationScopeGroupsComponent } from './pheno-trail-visualization-scope-groups.component';
import { PhenoTrailVisualizationScopeGroupComponent } from './pheno-trail-visualization-scope-group.component';
import { PhenoTrailVisualizationScopeStationGroupsComponent } from './pheno-trail-visualization-scope-station-groups.component';

import {EntityService} from './entity.service';

import {FormsModule,ReactiveFormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatCheckboxModule,MatGridListModule,MatCardModule,MatListModule,
        MatTooltipModule,MatSnackBarModule,MatDialogModule,MatStepperModule,
        MatButtonModule,MatRadioModule,MatProgressSpinnerModule,MatSelectModule,
        MatInputModule,MatFormFieldModule,MatTabsModule,MatButtonToggleModule,MatIconModule} from '@angular/material';

import { FlexLayoutModule } from '@angular/flex-layout';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

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
    PhenologyTrailPartnersComponent,
    FocalSpeciesComponent,
    FindingsComponent,
    ResourcesComponent,
    NewVisualizationBuilderComponent,
    RefugeVisualizationScopeSelectionComponent,
    PhenoTrailVisualizationScopeSelectionComponent,
    PhenoTrailVisualizationScopeGroupsComponent,
    PhenoTrailVisualizationScopeGroupComponent,
    PhenoTrailVisualizationScopeStationGroupsComponent,
    NewVisualizationDialogComponent,
    SafeHtmlPipe
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
    FontAwesomeModule,MatIconModule,
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
