import { Injectable } from '@angular/core';
import { SpeciesTitlePipe, NpnServiceUtils } from '../../common';
import { CalendarSelection } from './calendar-selection';

@Injectable()
export class CalendarSelectionFactory {
    requestSrc: string = 'npn-vis-calendar';

    constructor(protected serviceUtils:NpnServiceUtils,protected speciesTitle:SpeciesTitlePipe) {}

    newSelection(): CalendarSelection {
        return new CalendarSelection(this.serviceUtils,this.speciesTitle);
    }
}
