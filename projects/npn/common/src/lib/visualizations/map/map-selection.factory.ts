import { Injectable } from '@angular/core';
import { MapSelection } from './map-selection';

@Injectable()
export class MapSelectionFactory {
    newSelection():MapSelection {
        return new MapSelection();
    }
}