import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MaterialModule } from './material';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material';

import {
  PhenoNearModule,
  ExplorePhenoModule,
  SettingsModule
} from './routes';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { NpnCommonModule, NpnConfiguration, NPN_CONFIGURATION } from '@npn/common';
import { AgmCoreModule } from '@agm/core';
import { environment } from '../environments/environment';
// local services to make sure they're singleton's
import { SharingService } from './routes/explore_pheno/sharing.service';
import { StoriesService } from './routes/stories/stories.service';

export function npnConfigurationFactory():NpnConfiguration {
  return environment.npnConfiguration;
}

@NgModule({
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MaterialModule,

    NpnCommonModule,

    PhenoNearModule,
    ExplorePhenoModule,
    SettingsModule,
    AppRoutingModule,

    AgmCoreModule.forRoot({
      apiKey: environment.googleMapsApiKey,
      libraries: ['drawing']
    })
  ],
  declarations: [
    AppComponent
  ],
  providers: [
    {provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: { duration: 2500 }},
    {provide: NPN_CONFIGURATION, useFactory: npnConfigurationFactory },
    SharingService,
    StoriesService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
