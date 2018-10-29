import {Injectable,Inject} from '@angular/core';

import {DatePipe} from '@angular/common';
import {NpnServiceUtils} from '../../common';
import {WmsMapLegendService,WcsDataService} from '../../gridded';

import {ClippedWmsMapSelection} from './clipped-wms-map-selection';

@Injectable()
export class ClippedWmsMapSelectionFactory {
    constructor(protected serviceUtils:NpnServiceUtils,
                protected datePipe: DatePipe,
                protected mapLegendService:WmsMapLegendService,
                protected dataService:WcsDataService) {}

    newSelection(): ClippedWmsMapSelection {
        return new ClippedWmsMapSelection(this.serviceUtils,this.datePipe,this.mapLegendService,this.dataService);
    }
}
