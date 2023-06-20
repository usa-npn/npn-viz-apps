import { NgModule } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatSliderModule, MatSelectModule } from '@angular/material';

import { NpnMapLayerService } from './npn-map-layer.service';
import { NpnCommonModule } from '../common/index';
import { MapLayerLegendComponent } from './map-layer-legend.component';
import { SupportsOpacityControl } from './supports-opacity-control.component';
import { GriddedUrls } from './gridded-common';
import { WcsDataService } from './wcs-data.service';
import { BoundaryService } from './boundary.service';

import {
    LegendGddUnitsPipe, LegendBuffelgrassUnitsPipe, LegendDoyUnitsPipe, AgddDefaultTodayElevationPipe, LegendAgddAnomalyPipe,
    AgddDefaultTodayTimePipe, LegendSixAnomalyPipe, LegendDoyPipe, ExtentDatesPipe,
    ThirtyYearAvgDayOfYearPipe,GriddedPipeProvider
} from './pipes';

@NgModule({
    imports: [
        FormsModule, ReactiveFormsModule,
        MatSliderModule,
        MatSelectModule,
        NpnCommonModule
    ],
    declarations: [
        MapLayerLegendComponent,
        SupportsOpacityControl,
        LegendBuffelgrassUnitsPipe, LegendDoyUnitsPipe, LegendGddUnitsPipe, AgddDefaultTodayElevationPipe, LegendAgddAnomalyPipe,
        AgddDefaultTodayTimePipe, LegendSixAnomalyPipe, LegendDoyPipe, ExtentDatesPipe,
        ThirtyYearAvgDayOfYearPipe,
    ],
    exports: [
        MapLayerLegendComponent,
        SupportsOpacityControl,
    ],
    providers: [
        DatePipe, DecimalPipe,
        LegendBuffelgrassUnitsPipe, LegendDoyUnitsPipe, LegendGddUnitsPipe, AgddDefaultTodayElevationPipe, LegendAgddAnomalyPipe,
        AgddDefaultTodayTimePipe, LegendSixAnomalyPipe, LegendDoyPipe, ExtentDatesPipe,
        ThirtyYearAvgDayOfYearPipe, GriddedPipeProvider,
        NpnMapLayerService,
        GriddedUrls,
        WcsDataService,
        BoundaryService
    ]
})
export class NpnGriddedModule { }