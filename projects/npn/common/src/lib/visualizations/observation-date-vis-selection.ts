import { HttpParams } from '@angular/common/http';

import { StationAwareVisSelection, selectionProperty, POPInput, BASE_POP_INPUT, SelectionGroup, GroupHttpParams } from './vis-selection';
import { NpnServiceUtils, SpeciesPlot, TaxonomicSpeciesTitlePipe, getSpeciesPlotKeys, TaxonomicSpeciesRank, TaxonomicPhenophaseRank, SpeciesService, NetworkService, getStaticColor } from '../common';

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

export interface ObservationDatePlotData {
    plot: ObservationDatePlot;
    group?: SelectionGroup;
    data: any;
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

    /** The maximum number of plots we want to allow. */
    readonly MAX_PLOTS:number = 10;

    constructor(
        protected serviceUtils:NpnServiceUtils,
        protected speciesTitle:TaxonomicSpeciesTitlePipe,
        protected speciesService:SpeciesService,
        protected networkService:NetworkService
    ) {
        super(serviceUtils,networkService);
    }

    isValid(): boolean {
        return this.years && this.years.length && this.validPlots.length > 0;
    }

    get validPlots(): ObservationDatePlot[] {
        return (this.plots || []).filter(p => {
            return p.species && p.phenophase && 
                // color only required if not grouping
                (p.color || (this.groups && this.groups.length > 0));
        });
    }

    /**
     * Indicates whether or not adding one more plot will result in a visualization exceeding
     * the maximum number of allowed plots.
     */
    get canAddPlot():boolean {
        const years = this.years ? this.years.length : 0;
        const groups = this.groups ? this.groups.length : 0;
        const next_plots = ((this.plots ? this.plots.length : 0)+1)*years;
        const next_count = groups ? (groups * next_plots) : next_plots;
        return next_count <= this.MAX_PLOTS;
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

    postProcessData(data: ObservationDatePlotData[]): ObservationDateData {
        if (!data || !data.length) {
            return null;
        }
        const plots = data.map(d => d.plot);
        let y = (plots.length * this.years.length) -1;
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
        data.forEach(d => {
            const plot = d.plot;
            const group = d.group;
            const rData:any= d.data;
            let pPhases = {years:{}}; // empty
            const pPhaseKey = plot.phenophaseRank === TaxonomicPhenophaseRank.CLASS ? 'pheno_classes' : 'phenophases';
            if(rData && rData[pPhaseKey] && rData[pPhaseKey].length) {
                pPhases = rData[pPhaseKey][0];
            }
            this.years.forEach(year => {
                if(pPhases.years[year]) {
                    if(this.negative) {
                        addDoys(pPhases.years[year].negative,this.negativeColor);
                    }
                    addDoys(pPhases.years[year].positive,plot.color);
                }
                const pp = plot.phenophase as any;
                response.labels.splice(0, 0, 
                    ` ${year}: `+
                    this.speciesTitle.transform(plot.species,plot.speciesRank) +
                    ' - '+
                    (pp.phenophase_name||pp.pheno_class_name)+
                    (!!group ? ` (${group.label})` : ''));
                y--;
            })
        });
        console.log('observation data', response);
        return response;
    }

    getData(): Promise<ObservationDatePlotData[]> {
        // work around TypeScript Promise.all issue
        return this._getData();
    }

    private _getData(): Promise<any> {
        if (!this.isValid()) {
            return Promise.reject(this.INVALID_SELECTION);
        }
        const fetchDataForPlot = (baseParams,plot,group?) => {
            const keys = getSpeciesPlotKeys(plot);
            let plotParams = baseParams.set(`${keys.speciesIdKey}[0]`,`${plot.species[keys.speciesIdKey]}`)
                .set(`${keys.phenophaseIdKey}[0]`,`${plot.phenophase[keys.phenophaseIdKey]}`);
            if((plot.speciesRank||TaxonomicSpeciesRank.SPECIES) !== TaxonomicSpeciesRank.SPECIES) {
                plotParams = plotParams.set('taxonomy_aggregate','1');
            }
            if(plot.phenophaseRank === TaxonomicPhenophaseRank.CLASS) {
                plotParams = plotParams.set('pheno_class_aggregate','1');
            }
            return this.serviceUtils.cachedPost(serviceUrl,plotParams.toString())
                .then((results:any[]) => {
                    const data = results[0];
                    return {plot,data,group};
                });
        };
        this.working = true;
        const serviceUrl = this.serviceUtils.apiUrl('/npn_portal/observations/getObservationDates.json');
        return this.toURLSearchParams()
            // one request per valid plot
            .then(baseParams => {
                const validPlots = this.validPlots;
                return (this.groups && this.groups.length)
                    ? this.toGroupHttpParams(baseParams)
                        .then((groupParams:GroupHttpParams[]) => {
                            let plotIndex = 0;
                            // just to make TypeScript happy...
                            const arr:Promise<ObservationDatePlotData>[] = [];
                            const promises = validPlots.reduce((promises,p) => {
                                groupParams.forEach(gp => {
                                    const plot = JSON.parse(JSON.stringify(p));
                                    plot.color = getStaticColor(plotIndex++);
                                    promises.push(fetchDataForPlot(gp.params,plot,gp.group));
                                });
                                return promises;
                            },arr);
                            return Promise.all(promises);
                        })
                    : Promise.all(validPlots.map(plot => fetchDataForPlot(baseParams,plot)));
            })
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
