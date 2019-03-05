import { NpnServiceUtils } from '@npn/common/common';
import { AgddTimeSeriesSelection } from './agdd-time-series-selection';
import { Injectable } from '@angular/core';
import { NpnMapLayerService } from '@npn/common/gridded';

@Injectable()
export class AgddTimeSeriesSelectionFactory {
    constructor(private layerService:NpnMapLayerService, protected serviceUtils:NpnServiceUtils) {}

    newSelection(): AgddTimeSeriesSelection {
        return new AgddTimeSeriesSelection(this.layerService,this.serviceUtils);
    }
}