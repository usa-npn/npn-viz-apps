import { NgModule } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSliderModule, MatSelectModule } from '@angular/material';
import { Ng5SliderModule } from 'ng5-slider';

import { NpnMapLayerService } from './npn-map-layer.service';
import { NpnCommonModule } from '../common/index';
import { MapLayerLegendComponent } from './map-layer-legend.component';
import { SupportsOpacityControl } from './supports-opacity-control.component';
import { GriddedRangeSliderControl } from './gridded-range-slider-control.component';
import { GriddedUrls } from './gridded-common';
import { ExtentControl, ExtentDateControl, ExtentDoyControl, ExtentYearControl } from './extent-controls';
import { WcsDataService } from './wcs-data.service';

import {
    LegendGddUnitsPipe, AgddDefaultTodayElevationPipe, LegendAgddAnomalyPipe,
    AgddDefaultTodayTimePipe, LegendSixAnomalyPipe, LegendDoyPipe, ExtentDatesPipe,
    ThirtyYearAvgDayOfYearPipe,GriddedPipeProvider
} from './pipes';

@NgModule({
    imports: [
        BrowserAnimationsModule,
        BrowserModule,
        FormsModule, ReactiveFormsModule,
        MatSliderModule,
        MatSelectModule,
        Ng5SliderModule,
        NpnCommonModule
    ],
    declarations: [
        MapLayerLegendComponent,
        SupportsOpacityControl,
        GriddedRangeSliderControl,
        LegendGddUnitsPipe, AgddDefaultTodayElevationPipe, LegendAgddAnomalyPipe,
        AgddDefaultTodayTimePipe, LegendSixAnomalyPipe, LegendDoyPipe, ExtentDatesPipe,
        ThirtyYearAvgDayOfYearPipe,
        ExtentControl, ExtentDateControl, ExtentDoyControl, ExtentYearControl
    ],
    exports: [
        MapLayerLegendComponent,
        SupportsOpacityControl,
        GriddedRangeSliderControl,
        ExtentControl
    ],
    providers: [
        DatePipe, DecimalPipe,
        LegendGddUnitsPipe, AgddDefaultTodayElevationPipe, LegendAgddAnomalyPipe,
        AgddDefaultTodayTimePipe, LegendSixAnomalyPipe, LegendDoyPipe, ExtentDatesPipe,
        ThirtyYearAvgDayOfYearPipe, GriddedPipeProvider,
        NpnMapLayerService,
        GriddedUrls,
        WcsDataService
    ]
})
export class NpnGriddedModule { }