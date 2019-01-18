import { Injectable } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NpnServiceUtils } from '../../common';
import { ActivityCurvesSelection } from './activity-curves-selection';

@Injectable()
export class ActivityCurvesSelectionFactory {
    constructor(protected serviceUtils:NpnServiceUtils,protected datePipe: DatePipe) {}

    newSelection(): ActivityCurvesSelection {
        return new ActivityCurvesSelection(this.serviceUtils,this.datePipe);
    }
}
