import { Injectable } from '@angular/core';
import { NpnServiceUtils, SpeciesService } from '../../common';
import { ScatterPlotSelection } from './scatter-plot-selection';

@Injectable()
export class ScatterPlotSelectionFactory {
    constructor(private serviceUtils:NpnServiceUtils,private speciesService:SpeciesService) {}

    newSelection(): ScatterPlotSelection {
        return new ScatterPlotSelection(this.serviceUtils,this.speciesService);
    }
}
