import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MaterialModule } from './material';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material';

import {
  PhenoNearModule,
  ExplorePhenoModule
} from './routes';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

@NgModule({
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MaterialModule,

    PhenoNearModule,
    ExplorePhenoModule,
    AppRoutingModule
  ],
  declarations: [
    AppComponent
  ],
  providers: [
    {provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: { duration: 2500 }}
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
