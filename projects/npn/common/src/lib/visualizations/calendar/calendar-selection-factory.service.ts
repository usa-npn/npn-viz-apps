import { Injectable } from '@angular/core';
import { NpnServiceUtils, TaxonomicSpeciesTitlePipe, SpeciesService } from '../../common';
import { CalendarSelection } from './calendar-selection';

@Injectable()
export class CalendarSelectionFactory {
    requestSrc: string = 'npn-vis-calendar';

    constructor(
        private serviceUtils:NpnServiceUtils,
        private speciesTitle:TaxonomicSpeciesTitlePipe,
        private speciesService:SpeciesService
    ) {}

    newSelection(): CalendarSelection {
        return new CalendarSelection(this.serviceUtils,this.speciesTitle,this.speciesService);
    }
}
