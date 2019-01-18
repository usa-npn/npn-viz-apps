import { Injectable } from '@angular/core';
import { NpnServiceUtils } from '../../common';
import { ScatterPlotSelection } from './scatter-plot-selection';

@Injectable()
export class ScatterPlotSelectionFactory {
    constructor(protected serviceUtils:NpnServiceUtils) {}

    newSelection(): ScatterPlotSelection {
        return new ScatterPlotSelection(this.serviceUtils);
    }
}
