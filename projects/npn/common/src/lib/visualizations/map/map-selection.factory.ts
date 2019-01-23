import { Injectable } from '@angular/core';
import { MapSelection } from './map-selection';
import { WmsMapLayerService, WmsMapLegendService } from '../../gridded';

@Injectable()
export class MapSelectionFactory {
    constructor(
        private layerService:WmsMapLayerService,
        private legendService:WmsMapLegendService
    ) {}

    newSelection():MapSelection {
        return new MapSelection(this.layerService,this.legendService);
    }
}