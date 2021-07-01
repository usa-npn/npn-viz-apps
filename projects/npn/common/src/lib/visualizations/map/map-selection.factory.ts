import { Injectable } from '@angular/core';
import { MapSelection } from './map-selection';
import { NpnMapLayerService } from '../../gridded';
import { NpnServiceUtils, SpeciesService, NetworkService } from '../../common';
import { PointService } from '@npn/common/gridded/point.service';

@Injectable()
export class MapSelectionFactory {
    constructor(
        private layerService:NpnMapLayerService,
        private serviceUtils:NpnServiceUtils,
        private speciesService:SpeciesService,
        private networkService:NetworkService,
        private pointService:PointService
    ) {}

    newSelection():MapSelection {
        return new MapSelection(this.layerService,this.serviceUtils,this.speciesService,this.networkService,this.pointService);
    }
}