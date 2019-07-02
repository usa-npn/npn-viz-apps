import { Injectable } from '@angular/core';
import { MapSelection } from './map-selection';
import { NpnMapLayerService } from '../../gridded';
import { NpnServiceUtils, SpeciesService } from '../../common';

@Injectable()
export class MapSelectionFactory {
    constructor(
        private layerService:NpnMapLayerService,
        private serviceUtils:NpnServiceUtils,
        private speciesService:SpeciesService
    ) {}

    newSelection():MapSelection {
        return new MapSelection(this.layerService,this.serviceUtils,this.speciesService);
    }
}