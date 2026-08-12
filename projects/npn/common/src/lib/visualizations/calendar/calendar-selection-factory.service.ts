import { Injectable } from '@angular/core';
import { NpnServiceUtils, TaxonomicSpeciesTitlePipe, SpeciesService, NetworkService, ObservationDateService } from '../../common';
import { CalendarSelection } from './calendar-selection';

@Injectable()
export class CalendarSelectionFactory {
    constructor(
        private serviceUtils:NpnServiceUtils,
        private speciesTitle:TaxonomicSpeciesTitlePipe,
        private speciesService:SpeciesService,
        private networkService:NetworkService,
        private observationDateService:ObservationDateService
    ) {}

    newSelection(): CalendarSelection {
        return new CalendarSelection(this.serviceUtils,this.speciesTitle,this.speciesService,this.networkService,this.observationDateService);
    }
}
