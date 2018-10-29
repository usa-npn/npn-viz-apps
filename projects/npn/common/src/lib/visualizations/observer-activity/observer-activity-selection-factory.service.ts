import {Injectable} from '@angular/core';
import {CacheService,NpnServiceUtils} from '../../common';

import {ObserverActivitySelection} from './observer-activity-selection';

@Injectable()
export class ObserverActivitySelectionFactory {
    constructor(protected serviceUtils:NpnServiceUtils) {}

    newSelection(): ObserverActivitySelection {
        return new ObserverActivitySelection(this.serviceUtils);
    }
}
