import { Injectable, Inject } from '@angular/core';

import { DatePipe } from '@angular/common';
import { NpnServiceUtils, NetworkService } from '../../common';
import { WcsDataService, NpnMapLayerService } from '../../gridded';

import { ClippedWmsMapSelection } from './clipped-wms-map-selection';

@Injectable()
export class ClippedWmsMapSelectionFactory {
    constructor(protected serviceUtils:NpnServiceUtils,
                protected datePipe: DatePipe,
                protected layerService:NpnMapLayerService,
                protected dataService:WcsDataService,
                protected networkService:NetworkService) {}

    newSelection(): ClippedWmsMapSelection {
        return new ClippedWmsMapSelection(this.serviceUtils,this.datePipe,this.layerService,this.dataService,this.networkService);
    }
}
