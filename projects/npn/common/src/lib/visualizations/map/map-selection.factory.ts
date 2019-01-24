import { Injectable } from '@angular/core';
import { MapSelection } from './map-selection';
import { WmsMapLayerService } from '../../gridded';

@Injectable()
export class MapSelectionFactory {
    constructor(
        private layerService:WmsMapLayerService
    ) {}

    newSelection():MapSelection {
        return new MapSelection(this.layerService);
    }
}