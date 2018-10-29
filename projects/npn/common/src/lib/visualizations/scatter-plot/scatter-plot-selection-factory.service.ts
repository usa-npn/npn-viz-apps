import {Injectable,Inject} from '@angular/core';
import {Http} from '@angular/http';
import {CacheService,NpnConfiguration,NPN_CONFIGURATION} from '../../common';

import {ScatterPlotSelection} from './scatter-plot-selection';

@Injectable()
export class ScatterPlotSelectionFactory {
    constructor(protected http: Http,
                protected cacheService: CacheService,
                @Inject(NPN_CONFIGURATION) private config:NpnConfiguration) {}

    newSelection(): ScatterPlotSelection {
        return new ScatterPlotSelection(this.http,this.cacheService,this.config);
    }
}
