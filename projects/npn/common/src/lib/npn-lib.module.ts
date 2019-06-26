import {NgModule} from '@angular/core';
import {HttpClientModule} from '@angular/common/http';

import {VisualizationsModule} from './visualizations';
import {NpnCommonModule} from './common';

import {FormsModule} from '@angular/forms';

@NgModule({
  declarations: [
  ],
  imports: [
    NpnCommonModule,
    VisualizationsModule,
    HttpClientModule,
    FormsModule
  ]
})
export class NpnLibModule { }
