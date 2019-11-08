import { HttpParams } from '@angular/common/http';
import { NpnServiceUtils,  SpeciesPlot, getSpeciesPlotKeys, TaxonomicSpeciesRank, TaxonomicPhenophaseRank, SpeciesService } from '../common';
import { StationAwareVisSelection, selectionProperty, POPInput, BASE_POP_INPUT } from './vis-selection';

export interface SiteOrSummaryPlot extends SpeciesPlot {
    [x: string]: any;
}

export interface SiteOrSummaryPlotData {
    plot: SiteOrSummaryPlot;
    data: any[];
}

export abstract class SiteOrSummaryVisSelection extends StationAwareVisSelection {
    @selectionProperty()
    individualPhenometrics: boolean = false;
    @selectionProperty()
    _numDaysQualityFilter:number = 30;
    @selectionProperty({
        ser:d => {
            const {species,phenophase} = d;
            const o:any = {species,phenophase};
            Object.getOwnPropertyNames(d)
                .filter(key => key !== 'species' && key !== 'phenophase')
                .forEach(key => o[key] = d[key]);
            return o;
        }
    })
    plots:SiteOrSummaryPlot[] = [];

    constructor(
        protected serviceUtils:NpnServiceUtils,
        protected speciesService:SpeciesService
    ) {
        super(serviceUtils);
    }

    toURLSearchParams(params: HttpParams = new HttpParams()): Promise<HttpParams> {
        if(this.numDaysQualityFilter && this.numDaysQualityFilter > 0) {
            if(this.individualPhenometrics) {
                params = params.set('num_days_quality_filter_individual',`${this.numDaysQualityFilter}`)
            } else {
                params = params.set('num_days_quality_filter',`${this.numDaysQualityFilter}`)
            }
        }
        return super.toURLSearchParams(params);
    }

    toPOPInput(input:POPInput = {...BASE_POP_INPUT}):Promise<POPInput> {
        return super.toPOPInput(input)
            .then(input => {
                if(this.numDaysQualityFilter) {
                    input.dataPrecision = this.numDaysQualityFilter;
                }
                return this.speciesService.getSpeciesIds(this.validPlots)
                    .then(ids => {
                        input.species = ids;
                        return input;
                    });
            });
    }

    get validPlots():SiteOrSummaryPlot[] {
        return this.plots.filter(p => !!p.species && !!p.phenophase);
    }

    get numDaysQualityFilter():number {
        return this._numDaysQualityFilter;
    }
    set numDaysQualityFilter(n:number) {
        this._numDaysQualityFilter = n;
        this.update(); // param change
    }

    getData():Promise<SiteOrSummaryPlotData []> {
        // work around TypeScript Promise.all issue
        return this._getData();
    }

    private _getData(): Promise<any> {
        if (!this.isValid()) {
            return Promise.reject(this.INVALID_SELECTION);
        }
        const url = this.serviceUtils.apiUrl(`/npn_portal/observations/${this.individualPhenometrics ? 'getSummarizedData' : 'getSiteLevelData'}.json`);
        const filterLqd = (data,plot,plotIndex) => { // site
                const minusUnwanted =  data.filter(filterUnwantedDataFunctor(plot));
                const minusSuspect = minusUnwanted.filter(filterSuspectSummaryData);
                const filtered = minusSuspect.filter(this.individualPhenometrics ? filterLqSummaryData : filterLqSiteData);
                console.debug(`plot[${plotIndex}] filtered out ${data.length-minusUnwanted.length}/${data.length} unwanted records`);
                console.debug(`plot[${plotIndex}] filtered out ${minusUnwanted.length-minusSuspect.length}/${minusUnwanted.length} suspect records`);
                console.debug(`plot[${plotIndex}] filtered out ${minusSuspect.length-filtered.length}/${minusSuspect.length} LQD records`);
                if(this.individualPhenometrics) {
                    const individuals = filtered.reduce(function (map, d) {
                        var key = d.individual_id + '/' + d.phenophase_id + '/' + d.first_yes_year;
                        map[key] = map[key] || [];
                        map[key].push(d);
                        return map;
                    }, {});
                    const uniqueIndividuals = [];
                    for (let key in individuals) {
                        let arr = individuals[key];
                        if (arr.length > 1) {
                            // sort by first_yes_doy
                            arr.sort(function (a, b) {
                                return a.first_yes_doy - b.first_yes_doy;
                            });
                        }
                        // use the earliest record
                        uniqueIndividuals.push(arr[0]);
                    }
                    console.debug(`plot[${plotIndex}] filtered out ${(filtered.length - uniqueIndividuals.length)}/${filtered.length} individual records (preferring lowest first_yes_doy)`);
                    return uniqueIndividuals;
                }
                return filtered;
            };
        this.working = true;
        return this.toURLSearchParams()
            .then(baseParams => Promise.all(
                    this.validPlots.map((plot,plotIndex) => {
                        const keys = getSpeciesPlotKeys(plot);
                        let params = baseParams.set(`${keys.speciesIdKey}[0]`,`${plot.species[keys.speciesIdKey]}`)
                            .set(`${keys.phenophaseIdKey}[0]`,`${plot.phenophase[keys.phenophaseIdKey]}`);
                        if((plot.speciesRank||TaxonomicSpeciesRank.SPECIES) !== TaxonomicSpeciesRank.SPECIES) {
                            params = params.set('taxonomy_aggregate','1');
                        }
                        if(plot.phenophaseRank === TaxonomicPhenophaseRank.CLASS) {
                            params = params.set('pheno_class_aggregate','1');
                        }
                        params = params.set('climate_data','1');
                        return this.serviceUtils.cachedPost(url,params.toString())
                            .then(data => filterLqd(data,plot,plotIndex))
                            .then(data => ({plot,data}))
                    })
            ))
            .then((results) => {
                this.working = false;
                return results;
            })
            .catch(err => {
                this.working = false;
                this.handleError(err);
            });
    }
}

/**
 * The underlying services do not treat species/phenophase pairs as
 * parallel arrays but as independent arrays.  This means when two species
 * share a phenophase but if that phenophase is only requested for one of the two
 * extra recrods can be returned and need to be discarded.  This function
 * returns a function that can be passed to Array.filter to discard those records
 * from server responses.
 * 
 * Note: This should no longer ever prune out any unwanted records now that one request
 * is being made per plot
 */
function filterUnwantedDataFunctor(plot:SpeciesPlot):(any) => boolean {
    const keys = getSpeciesPlotKeys(plot);
    const speciesId = plot.species[keys.speciesIdKey];
    const phenoId = plot.phenophase[keys.phenophaseIdKey];
    return d => {
        const keep = speciesId == d[keys.speciesIdKey] &&
                        phenoId == d[keys.phenophaseIdKey];
        if(!keep) {
            console.warn('filtering unwanted response record',d);
        }
        return keep;
    };
}

function filterSuspectSummaryData(d):boolean {
    var bad = (d.latitude === 0.0 || d.longitude === 0.0 || d.elevation_in_meters < 0);
    if (bad) {
        console.warn('suspect station data', d);
    }
    return !bad;
}

function filterLqSummaryData(d):boolean {
    var keep = d.numdays_since_prior_no >= 0;
    if (!keep) {
        console.debug('filtering less precise data from summary output', d);
    }
    return keep;
}

function filterLqSiteData(d):boolean {
    var keep = d.mean_numdays_since_prior_no >= 0;
    if (!keep) {
        console.debug('filtering less precise data from site level output', d);
    }
    return keep;
}