import { HttpParams } from '@angular/common/http';

import { StationAwareVisSelection, selectionProperty } from './vis-selection';
import { Species, Phenophase, SpeciesTitlePipe, NpnServiceUtils } from '../common';

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

    constructor(
        protected serviceUtils:NpnServiceUtils,
        protected speciesTitle: SpeciesTitlePipe
    ) {
        super(serviceUtils);
    }

    isValid(): boolean {
        return this.years && this.years.length && this.validPlots.length > 0;
    }

    get validPlots(): ObservationDatePlot[] {
        return (this.plots || []).filter(p => {
            return p.color && p.species && p.phenophase;
        });
    }

    toURLSearchParams(params: HttpParams = new HttpParams()): Promise<HttpParams> {
        params = params.set('request_src', this.requestSrc);
        this.years.forEach((y, i) => {
            params = params.set(`year[${i}]`, `${y}`);
        });
        this.validPlots.forEach((plot, i) => {
            params = params.set(`species_id[${i}]`, `${plot.species.species_id}`)
                           .set(`phenophase_id[${i}]`, `${plot.phenophase.phenophase_id}`);
        });
        return super.toURLSearchParams(params);
    }

    postProcessData(data: any[]): ObservationDateData {
        if (!data || !data.length) {
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
        this.working = true;
        return this.toURLSearchParams()
            .then(params => this.serviceUtils.cachedPost(this.serviceUtils.apiUrl('/npn_portal/observations/getObservationDates.json'),params.toString())
            .then(arr => {
                this.working = false;
                return arr;
            })
            .catch(err => {
                this.working = false;
                this.handleError(err);
            }));
        ;
    }
}
