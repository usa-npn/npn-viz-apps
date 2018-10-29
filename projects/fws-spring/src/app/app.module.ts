import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { NgModule, enableProdMode } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { NpnLibModule, NpnCommonModule, VisualizationsModule, NPN_BASE_HREF, NPN_CONFIGURATION, NpnGriddedModule } from '@npn/common';

import { RefugeControl } from './refuge-control.component';
import { SpringDashboardComponent } from './spring-dashboard.component';
import { RefugeService } from './refuge.service';
import { StatusOfSpringComponent } from './status-of-spring.component';
import { StartOfSpringComponent } from './start-of-spring.component';

import { FormsModule, ReactiveFormsModule, NgModel } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  MatTabsModule, MatDialogModule,
  MatProgressSpinnerModule, MatIconModule, MatButtonModule, MatTooltipModule,
  MatFormFieldModule, MatSelectModule, MatInputModule, MatAutocompleteModule
} from '@angular/material';

import { FlexLayoutModule } from '@angular/flex-layout';

import { environment } from '../environments/environment';
import { AgmCoreModule } from '@agm/core';
import { StartOfSpringDialog, SosDoyTransform } from './start-of-spring-dialog.component';

export function baseHrefFactory() {
  return window['npn_base_href'];
}
export function npnConfigurationFactory() {
  return window['npn_configuration'];
}

@NgModule({
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    CommonModule,
    FormsModule, ReactiveFormsModule,

    NpnLibModule,
    NpnGriddedModule,
    VisualizationsModule,
    NpnCommonModule,

    HttpClientModule,

    MatTabsModule, MatDialogModule,
    MatProgressSpinnerModule, MatIconModule, MatButtonModule, MatTooltipModule,
    MatFormFieldModule, MatSelectModule, MatInputModule, MatAutocompleteModule,

    FlexLayoutModule, // TODO - do I need?

    AgmCoreModule.forRoot({
      apiKey: environment.googleMapsApiKey
    })
  ],
  declarations: [
    RefugeControl,
    SpringDashboardComponent,
    StatusOfSpringComponent,
    StartOfSpringComponent,
    StartOfSpringDialog,
    SosDoyTransform
  ],
  providers: [
    RefugeService,
    { provide: NPN_BASE_HREF, useFactory: baseHrefFactory },
    { provide: NPN_CONFIGURATION, useFactory: npnConfigurationFactory }
  ],
  entryComponents: [
    StartOfSpringDialog
  ],
  bootstrap: [SpringDashboardComponent],
})
export class AppModule { }

