/*
NOTE: this is currently one BIG module that includes all the visualizations.
that's ok generally but it would be better to have each visualization be its own
module that deals with its own dependencies so that they could be imported individually
into an application (and simplify this module's imports).

see the commented out start of such a module in ./clipped-wms-map

probably should be an activity for a later date, or if time permits.
*/
import { NgModule } from '@angular/core';
import { CommonModule,DatePipe } from '@angular/common';
import { FormsModule,ReactiveFormsModule } from '@angular/forms';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import {VisualizationDownloadComponent} from './visualization-download.component';

import {ScatterPlotSelectionFactory,ScatterPlotComponent,ScatterPlotControls} from './scatter-plot';
import {CalendarSelectionFactory,CalendarComponent,CalendarControlComponent} from './calendar';
import {ActivityCurvesSelectionFactory,ActivityCurvesComponent,CurveControlComponent,ActivityCurvesControlComponent} from './activity-curves';
import {ClippedWmsMapComponent,ClippedWmsMapControl,ClippedWmsMapStatisticsComponent,ClippedStatValuePipe,ClippedWmsMapSelectionFactory} from './clipped-wms-map';
//import {ClippedWmsMapVisModule} from './clipped-wms-map';
import {ObserverActivitySelectionFactory,ObserverActivityComponent,ObserverActivityControl} from './observer-activity';
import {ObservationFrequencySelectionFactory,ObservationFrequencyComponent,ObservationFrequencyControl,ObvervationFrequencyStationControlComponent} from './observation-frequency';

import {
    MapSelectionFactory,
    MapVisualizationComponent,
    ExtentControl, ExtentDateControl, ExtentDoyControl, ExtentYearControl,
    GriddedRangeSliderControl,
    ConsolidatedMapLayerControlComponent,
    PestMapLayerControlComponent,
    TempAccumMapLayerControlComponent,
    SpringIndexMapLayerControlComponent,
    MapVisualizationMarkerIw
} from './map';

import {VisualizationComponent} from './visualization.component';

import {VisualizationSelectionFactory} from './visualization-selection-factory.service';
import {SpeciesPhenophaseInputComponent,YearRangeInputComponent} from './common-controls';

import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatFormFieldModule,MatButtonModule, MatCheckboxModule, MatSelectModule,
        MatExpansionModule,MatAutocompleteModule,
        MatInputModule, MatSliderModule, MatProgressBarModule, MatTooltipModule,
        MatDatepickerModule, MatNativeDateModule, MAT_DATE_FORMATS } from '@angular/material';
import { Ng5SliderModule } from 'ng5-slider';

import {AgmCoreModule} from '@agm/core';
import { FlexLayoutModule } from '@angular/flex-layout';

import {NpnCommonModule} from '../common';
import {NpnGriddedModule} from '../gridded';

@NgModule({
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    CommonModule,
    FormsModule,ReactiveFormsModule,
    FontAwesomeModule,
    MatFormFieldModule,MatButtonModule, MatCheckboxModule,MatSelectModule,
    MatExpansionModule,MatAutocompleteModule,
    MatInputModule, MatSliderModule, MatProgressBarModule, MatTooltipModule, MatDatepickerModule,
    MatNativeDateModule,
    Ng5SliderModule,
    AgmCoreModule,
    FlexLayoutModule,
    NpnCommonModule,NpnGriddedModule
  ],
  declarations: [
      //VisualizationBaseComponent,SvgVisualizationBaseComponent,MapVisualizationBaseComponent,
      ScatterPlotComponent,ScatterPlotControls,
      CalendarComponent,CalendarControlComponent,
      ActivityCurvesComponent,CurveControlComponent,ActivityCurvesControlComponent,
      ObserverActivityComponent,ObserverActivityControl,
      ObservationFrequencyComponent,ObservationFrequencyControl,ObvervationFrequencyStationControlComponent /* not exported private */,
      ClippedWmsMapComponent,ClippedWmsMapControl,ClippedWmsMapStatisticsComponent,ClippedStatValuePipe /* not exported */,
      MapVisualizationComponent,
      VisualizationDownloadComponent,
      VisualizationComponent,
      SpeciesPhenophaseInputComponent,
      YearRangeInputComponent,

      ExtentControl, ExtentDateControl, ExtentDoyControl, ExtentYearControl,
      GriddedRangeSliderControl,
      ConsolidatedMapLayerControlComponent,PestMapLayerControlComponent,TempAccumMapLayerControlComponent,SpringIndexMapLayerControlComponent,MapVisualizationMarkerIw
  ],
  exports: [
      ScatterPlotComponent,
      ScatterPlotControls,
      ActivityCurvesComponent,CurveControlComponent,ActivityCurvesControlComponent,
      ObserverActivityComponent,ObserverActivityControl,
      ObservationFrequencyComponent,ObservationFrequencyControl,
      CalendarComponent,CalendarControlComponent,
      ClippedWmsMapComponent,ClippedWmsMapControl,ClippedWmsMapStatisticsComponent,
      MapVisualizationComponent,
      VisualizationComponent,
      SpeciesPhenophaseInputComponent,
      YearRangeInputComponent,
      ExtentControl,
      GriddedRangeSliderControl,
      ConsolidatedMapLayerControlComponent
  ],
  providers: [
      DatePipe,
      // can inject a specific type of factory
      ScatterPlotSelectionFactory,
      CalendarSelectionFactory,
      ClippedWmsMapSelectionFactory,
      ActivityCurvesSelectionFactory,
      ObserverActivitySelectionFactory,
      ObservationFrequencySelectionFactory,
      MapSelectionFactory,
      // OR one factory to rule them all
      VisualizationSelectionFactory,
      {provide: MAT_DATE_FORMATS, useValue: {
        parse: { dateInput: null },
        display: {
          dateInput: {
            year: "numeric",
            month: "long",
            day: "numeric"
          },
          monthYearLabel: {
            year: "numeric",
            month: "long"
          },
          dateA11yLabel: {
            year: "numeric",
            month: "long",
            day: "numeric"
          },
          monthYearA11yLabel: {
            year: "numeric",
            month: "long"
          }
        }
      }
    }
  ]
})
export class VisualizationsModule { }

