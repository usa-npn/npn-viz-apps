import { HttpParams } from '@angular/common/http';

import { StationAwareVisSelection, selectionProperty, POPInput, BASE_POP_INPUT } from './vis-selection';
import { NpnServiceUtils, SpeciesPlot, TaxonomicSpeciesTitlePipe, getSpeciesPlotKeys, TaxonomicSpeciesRank, TaxonomicPhenophaseRank, SpeciesService } from '../common';

export interface ObservationDatePlot extends SpeciesPlot {
    [x: string]: any;
}

export interface ObservationDataDataPoint {
    x: number;
    y: number;
    color: string;
}
export interface ObservationDateData {
    labels: string[];
    data: ObservationDataDataPoint[];
}

export abstract class ObservationDateVisSelection extends StationAwareVisSelection {
    $supportsPop:boolean = true;

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
        protected speciesTitle:TaxonomicSpeciesTitlePipe,
        protected speciesService:SpeciesService
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
        return super.toURLSearchParams(params);
    }

    toPOPInput(input:POPInput = {...BASE_POP_INPUT}):Promise<POPInput> {
        return super.toPOPInput(input)
            .then(input => {
                const yearRange = this.years.reduce((range,y) => {
                        if(!range) {
                            return [y,y];
                        }
                        if(y < range[0]) {
                            range[0] = y;
                        }
                        if(y > range[1]) {
                            range[1] = y;
                        }
                        return range;
                    },undefined);
                if(yearRange) {
                    input.startDate = `${yearRange[0]}-01-01`;
                    input.endDate = `${yearRange[1]}-12-31`;
                }
                return this.speciesService.getSpeciesIds(this.validPlots)
                    .then(ids => {
                        input.species = ids;
                        return input;
                    });
            });
    }

    postProcessData(data: any): ObservationDateData {
        if (!data || !data.length) {
            return null;
        }
        const validPlots = this.validPlots;
        let y = (validPlots.length * this.years.length) -1;
        const addDoys = (doys, color) => {
            doys.forEach(doy => {
                response.data.push({
                    y: y,
                    x: doy,
                    color: color
                });
            });
        };
        const response:ObservationDateData = {
            labels: [],
            data: []
        };
        validPlots.forEach((plot,i) => {
            const rData:any= data[i][0];
            const pPhases = plot.phenophaseRank === TaxonomicPhenophaseRank.CLASS
                ? rData.pheno_classes[0]
                : rData.phenophases[0];
            this.years.forEach(year => {
                if(pPhases.years[year]) {
                    if(this.negative) {
                        addDoys(pPhases.years[year].negative,this.negativeColor);
                    }
                    addDoys(pPhases.years[year].positive,plot.color);
                }
                const pp = plot.phenophase as any;
                response.labels.splice(0, 0, this.speciesTitle.transform(plot.species,plot.speciesRank) + '/' + (pp.phenophase_name||pp.pheno_class_name) + ' (' + year + ')');
                y--;
            })
        });
        console.log('observation data', response);
        return response;
    }

    getData(): Promise<any> {
        if (!this.isValid()) {
            return Promise.reject(this.INVALID_SELECTION);
        }
        this.working = true;
        const serviceUrl = this.serviceUtils.apiUrl('/npn_portal/observations/getObservationDates.json');
        return this.toURLSearchParams()
            // one request per valid plot
            .then(params => Promise.all(
                    this.validPlots.map(plot => {
                        const keys = getSpeciesPlotKeys(plot);
                        let plotParams = params.set(`${keys.speciesIdKey}[0]`,`${plot.species[keys.speciesIdKey]}`)
                            .set(`${keys.phenophaseIdKey}[0]`,`${plot.phenophase[keys.phenophaseIdKey]}`);
                        if((plot.speciesRank||TaxonomicSpeciesRank.SPECIES) !== TaxonomicSpeciesRank.SPECIES) {
                            plotParams = plotParams.set('taxonomy_aggregate','1');
                        }
                        if(plot.phenophaseRank === TaxonomicPhenophaseRank.CLASS) {
                            plotParams = plotParams.set('pheno_class_aggregate','1');
                        }
                        return this.serviceUtils.cachedPost(serviceUrl,plotParams.toString());
                    })
                )
            )
            .then(result => {
                this.working = false;
                return result;
            })
            .catch(err => {
                this.working = false;
                this.handleError(err);
            });
    }
}
