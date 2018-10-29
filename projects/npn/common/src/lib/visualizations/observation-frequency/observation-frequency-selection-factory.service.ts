import {Injectable} from '@angular/core';
import {NetworkService,NpnServiceUtils} from '../../common';

import {ObservationFrequencySelection} from './observation-frequency-selection';

@Injectable()
export class ObservationFrequencySelectionFactory {
    constructor(protected serviceUtils:NpnServiceUtils,protected networkService: NetworkService) {}

    newSelection(): ObservationFrequencySelection {
        return new ObservationFrequencySelection(this.serviceUtils,this.networkService);
    }
}
