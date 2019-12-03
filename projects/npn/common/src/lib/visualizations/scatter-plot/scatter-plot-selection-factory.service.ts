import { Injectable } from '@angular/core';
import { NpnServiceUtils, SpeciesService, NetworkService } from '../../common';
import { ScatterPlotSelection } from './scatter-plot-selection';

@Injectable()
export class ScatterPlotSelectionFactory {
    constructor(
        private serviceUtils:NpnServiceUtils,
        private speciesService:SpeciesService,
        private networkService:NetworkService) {}

    newSelection(): ScatterPlotSelection {
        return new ScatterPlotSelection(this.serviceUtils,this.speciesService,this.networkService);
    }
}
