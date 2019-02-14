import { Injectable } from '@angular/core';
import { MapSelection } from './map-selection';
import { NpnMapLayerService } from '../../gridded';
import { NpnServiceUtils } from '../../common';

@Injectable()
export class MapSelectionFactory {
    constructor(
        private layerService:NpnMapLayerService,
        private serviceUtils:NpnServiceUtils
    ) {}

    newSelection():MapSelection {
        return new MapSelection(this.layerService,this.serviceUtils);
    }
}