import { Injectable, Inject } from '@angular/core';

import { DatePipe } from '@angular/common';
import { NpnServiceUtils } from '../../common';
import { WcsDataService, WmsMapLayerService } from '../../gridded';

import { ClippedWmsMapSelection } from './clipped-wms-map-selection';

@Injectable()
export class ClippedWmsMapSelectionFactory {
    constructor(protected serviceUtils:NpnServiceUtils,
                protected datePipe: DatePipe,
                protected layerService:WmsMapLayerService,
                protected dataService:WcsDataService) {}

    newSelection(): ClippedWmsMapSelection {
        return new ClippedWmsMapSelection(this.serviceUtils,this.datePipe,this.layerService,this.dataService);
    }
}
