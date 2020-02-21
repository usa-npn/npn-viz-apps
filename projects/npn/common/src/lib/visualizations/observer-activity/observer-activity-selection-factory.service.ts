import {Injectable} from '@angular/core';
import {NpnServiceUtils, NetworkService} from '../../common';

import {ObserverActivitySelection} from './observer-activity-selection';

@Injectable()
export class ObserverActivitySelectionFactory {
    constructor(protected serviceUtils:NpnServiceUtils,protected networkService:NetworkService) {}

    newSelection(): ObserverActivitySelection {
        return new ObserverActivitySelection(this.serviceUtils,this.networkService);
    }
}
