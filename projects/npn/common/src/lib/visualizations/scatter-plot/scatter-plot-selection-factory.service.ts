import { Injectable } from '@angular/core';
import { NpnServiceUtils, SpeciesService, NetworkService, ObservationService } from '../../common';
import { ScatterPlotSelection } from './scatter-plot-selection';

@Injectable()
export class ScatterPlotSelectionFactory {
    constructor(
        private serviceUtils:NpnServiceUtils,
        private speciesService:SpeciesService,
        private networkService:NetworkService,
        private observationService:ObservationService) {}

    newSelection(): ScatterPlotSelection {
        return new ScatterPlotSelection(this.serviceUtils,this.speciesService,this.networkService,this.observationService);
    }
}
