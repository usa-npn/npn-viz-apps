import {Injectable,Inject} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {CacheService,NpnConfiguration,NPN_CONFIGURATION} from '../../common';

import {ScatterPlotSelection} from './scatter-plot-selection';

@Injectable()
export class ScatterPlotSelectionFactory {
    constructor(protected http: HttpClient,
                protected cacheService: CacheService,
                @Inject(NPN_CONFIGURATION) private config:NpnConfiguration) {}

    newSelection(): ScatterPlotSelection {
        return new ScatterPlotSelection(this.http,this.cacheService,this.config);
    }
}
