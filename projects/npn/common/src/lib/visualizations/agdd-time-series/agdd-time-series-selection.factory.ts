import { NpnServiceUtils } from '@npn/common/common';
import { AgddTimeSeriesSelection } from './agdd-time-series-selection';
import { Injectable } from '@angular/core';

@Injectable()
export class AgddTimeSeriesSelectionFactory {
    constructor(protected serviceUtils:NpnServiceUtils) {}

    newSelection(): AgddTimeSeriesSelection {
        return new AgddTimeSeriesSelection(this.serviceUtils);
    }
}