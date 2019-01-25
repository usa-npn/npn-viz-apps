import { Injectable } from '@angular/core';
import { MapSelection } from './map-selection';
import { NpnMapLayerService } from '../../gridded';

@Injectable()
export class MapSelectionFactory {
    constructor(
        private layerService:NpnMapLayerService
    ) {}

    newSelection():MapSelection {
        return new MapSelection(this.layerService);
    }
}