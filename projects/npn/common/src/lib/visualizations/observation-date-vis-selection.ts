import {HttpClient, HttpParams} from '@angular/common/http';

import { StationAwareVisSelection, selectionProperty } from './vis-selection';
import { CacheService, Species, Phenophase, SpeciesTitlePipe, NpnConfiguration } from '../common';

export class ObservationDatePlot {
    color?: String;
    species?: Species;
    phenophase?: Phenophase;
    [x: string]: any;
}

export class ObservationDataDataPoint {
    x: number;
    y: number;
    color: string;
}
export class ObservationDateData {
    labels: string[] = [];
    data: ObservationDataDataPoint[] = [];
}

export abstract class ObservationDateVisSelection extends StationAwareVisSelection {
    requestSrc: string = 'observation-date-vis-selection';

    @selectionProperty()
    negative: boolean = false;
    @selectionProperty()
    negativeColor: string = '#aaa'
    @selectionProperty()
    years: number[] = [];
    @selectionProperty()
    plots: ObservationDatePlot[] = [];

    constructor(protected http: HttpClient,
        protected cacheService: CacheService,
        protected speciesTitle: SpeciesTitlePipe,
        protected config: NpnConfiguration) {
        super();
    }

    isValid(): boolean {
        return this.years && this.years.length && this.validPlots.length > 0;
    }

    get validPlots(): ObservationDatePlot[] {
        return (this.plots || []).filter(p => {
            return p.color && p.species && p.phenophase;
        });
    }

    toURLSearchParams(): HttpParams {
        let params = new HttpParams();
        params.set('request_src', this.requestSrc);
        this.years.forEach((y, i) => {
            params.set(`year[${i}]`, `${y}`);
        });
        this.validPlots.forEach((plot, i) => {
            params.set(`species_id[${i}]`, `${plot.species.species_id}`);
            params.set(`phenophase_id[${i}]`, `${plot.phenophase.phenophase_id}`);
        });
        this.addNetworkParams(params);
        return params;
    }

    postProcessData(data: any[]): ObservationDateData {
        if (!data) {
            return null;
        }
        let response = new ObservationDateData(),
            vPlots = this.validPlots,
            y = (vPlots.length * this.years.length) - 1,
            addDoys = (doys, color) => {
                doys.forEach(doy => {
                    response.data.push({
                        y: y,
                        x: doy,
                        color: color
                    });
                });
            },
            speciesMap = data.reduce((map, species) => {
                map[species.species_id] = species;
                // first time translate phenophases array to a map.
                if (Array.isArray(species.phenophases)) {
                    species.phenophases = species.phenophases.reduce(function (m, pp) {
                        m[pp.phenophase_id] = pp;
                        return m;
                    }, {});
                }
                return map;
            }, {});
        console.log('speciesMap', speciesMap);
        vPlots.forEach(plot => {
            let species = speciesMap[plot.species.species_id],
                phenophase = species.phenophases[plot.phenophase.phenophase_id];
            this.years.forEach(year => {
                if (phenophase && phenophase.years && phenophase.years[year]) {
                    if (this.negative) {
                        console.debug('year negative', y, year, species.common_name, phenophase, phenophase.years[year].negative);
                        addDoys(phenophase.years[year].negative, this.negativeColor);
                    }
                    console.debug('year positive', y, year, species.common_name, phenophase, phenophase.years[year].positive);
                    addDoys(phenophase.years[year].positive, plot.color);
                }
                response.labels.splice(0, 0, this.speciesTitle.transform(plot.species) + '/' + plot.phenophase.phenophase_name + ' (' + year + ')');
                console.debug('y of ' + y + ' is for ' + response.labels[0]);
                y--;
            });
        });
        console.log('observation data', response);
        return response;
    }

    getData(): Promise<any[]> {
        if (!this.isValid()) {
            return Promise.reject(this.INVALID_SELECTION);
        }
        let params = this.toURLSearchParams(),
            url = `${this.config.apiRoot}/npn_portal/observations/getObservationDates.json`,
            cacheKey = {
                u: url,
                params: params.toString()
            },
            data: any[] = this.cacheService.get(cacheKey);

        if (data) {
            return Promise.resolve(data);
        } else {
            this.working = true;
            return new Promise(resolve => {
                this.http.post(url,params.toString(),{headers: this.headers})
                    .toPromise()
                    .then(response => {
                        let arr = response as any[];
                        this.cacheService.set(cacheKey,arr);
                        this.working = false;
                        resolve(arr);
                    })
                    .catch(this.handleError);
            });
        }
    }
}
