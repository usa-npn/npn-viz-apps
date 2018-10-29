import {Injectable,Inject} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {CacheService,SpeciesTitlePipe,NpnConfiguration,NPN_CONFIGURATION} from '../../common';

import {CalendarSelection} from './calendar-selection';

@Injectable()
export class CalendarSelectionFactory {
    requestSrc: string = 'npn-vis-calendar';

    constructor(protected http: HttpClient,
                protected cacheService: CacheService,
                protected speciesTitle:SpeciesTitlePipe,
                @Inject(NPN_CONFIGURATION) private config:NpnConfiguration) {}

    newSelection(): CalendarSelection {
        return new CalendarSelection(this.http,this.cacheService,this.speciesTitle,this.config);
    }
}
