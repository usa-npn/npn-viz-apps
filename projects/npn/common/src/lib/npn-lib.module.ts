import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {HttpClientModule} from '@angular/common/http';

import {VisualizationsModule} from './visualizations';
import {NpnCommonModule} from './common';

import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

@NgModule({
  declarations: [
  ],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    NpnCommonModule,
    VisualizationsModule,
    HttpClientModule,
    FormsModule
  ]
})
export class NpnLibModule { }
