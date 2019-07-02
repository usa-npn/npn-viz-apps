import { HttpParams } from '@angular/common/http';
import { NpnServiceUtils,  SpeciesPlot, getSpeciesPlotKeys, TaxonomicSpeciesRank, TaxonomicPhenophaseRank } from '../common';
import { StationAwareVisSelection, selectionProperty, POPInput, BASE_POP_INPUT } from './vis-selection';

const FILTER_LQD_DISCLAIMER = 'For quality assurance purposes, only onset dates that are preceded by negative records are included in the visualization.';
const DEFAULT_NUM_DAYS_Q_FILTER = 30;

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
    filterDisclaimer: string;
    @selectionProperty()
    _filterLqdSummary: boolean = true;
    @selectionProperty()
    _numDaysQualityFilter:number = DEFAULT_NUM_DAYS_Q_FILTER;
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

    constructor(protected serviceUtils:NpnServiceUtils) {
        super(serviceUtils);
    }

    toURLSearchParams(params: HttpParams = new HttpParams()): Promise<HttpParams> {
        if(this.numDaysQualityFilter) {
            params = params.set('num_days_quality_filter',`${this.numDaysQualityFilter}`)
        }
        return super.toURLSearchParams(params);
    }

    toPOPInput(input:POPInput = {...BASE_POP_INPUT}):Promise<POPInput> {
        return super.toPOPInput(input)
            .then(input => {
                if(this.numDaysQualityFilter) {
                    input.dataPrecision = this.numDaysQualityFilter;
                }
                /* TODO POP
                input.species =
                    this.validPlots.map(p => typeof(p.species.species_id) === 'number' ? p.species.species_id : parseInt(p.species.species_id));
                */
                // POP supports phenophases but seems to present a higher-level list of possibilities
                //input.phenophases = this.validPlots.map(p => typeof(p.phenophase.phenophase_id) === 'number' ? p.phenophase.phenophase_id : parseInt(p.phenophase.phenophase_id));
                return input;
            });
    }

    get validPlots():SiteOrSummaryPlot[] {
        return this.plots.filter(p => !!p.species && !!p.phenophase);
    }

    get filterLqdSummary():boolean {
        return this._filterLqdSummary;
    }
    set filterLqdSummary(b:boolean) {
        this._filterLqdSummary = b;
        this.update();
    }

    get numDaysQualityFilter():number {
        return this._numDaysQualityFilter;
    }
    set numDaysQualityFilter(n:number) {
        this._numDaysQualityFilter = n;
        this.update(); // param change
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
    private filterUnwantedDataFunctor(plot:SpeciesPlot) {
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

    private filterSuspectSummaryData(d) {
        var bad = (d.latitude === 0.0 || d.longitude === 0.0 || d.elevation_in_meters < 0);
        if (bad) {
            console.warn('suspect station data', d);
        }
        return !bad;
    }

    private filterLqSummaryData(d) {
        var keep = d.numdays_since_prior_no >= 0;
        if (!keep) {
            console.debug('filtering less precise data from summary output', d);
        }
        return keep;
    }

    private filterLqSiteData(d) {
        var keep = d.mean_numdays_since_prior_no >= 0;
        if (!keep) {
            console.debug('filtering less precise data from site level output', d);
        }
        return keep;
    }

    getData():Promise<SiteOrSummaryPlotData []> {
        // work around typeScript Promise.all issue
        return this._getData();
    }

    private _getData(): Promise<any> {
        if (!this.isValid()) {
            return Promise.reject(this.INVALID_SELECTION);
        }
        const url = this.serviceUtils.apiUrl(`/npn_portal/observations/${this.individualPhenometrics ? 'getSummarizedData' : 'getSiteLevelData'}.json`);
        // TODO see about consolidating this filtering logic
        const filterLqd = this.individualPhenometrics
            ? (data,plot,plotIndex) => { // summary
                let minusUnwanted = data.filter(this.filterUnwantedDataFunctor(plot)),
                    minusSuspect = minusUnwanted.filter(this.filterSuspectSummaryData),
                    filtered = this.filterLqdSummary ? minusSuspect.filter(this.filterLqSummaryData) : minusSuspect,
                    individuals = filtered.reduce(function (map, d) {
                        var key = d.individual_id + '/' + d.phenophase_id + '/' + d.first_yes_year;
                        map[key] = map[key] || [];
                        map[key].push(d);
                        return map;
                    }, {}),
                    uniqueIndividuals = [];
                console.debug(`plot[${plotIndex}] filtered out ${data.length-minusUnwanted.length}/${data.length} unwanted records`);
                console.debug(`plot[${plotIndex}] filtered out ${minusUnwanted.length-minusSuspect.length}/${minusUnwanted.length} suspect records`);
                console.debug(`plot[${plotIndex}] filtered out ${minusSuspect.length-filtered.length}/${minusSuspect.length} LQD records`);
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
                console.debug('filtered out ' + (filtered.length - uniqueIndividuals.length) + '/' + filtered.length + ' individual records (preferring lowest first_yes_doy)');

                /*
                this.filterDisclaimer = (minusSuspect.length !== filtered.length) ? FILTER_LQD_DISCLAIMER : undefined;
                */
                return filtered;
            }
            : (data,plot,plotIndex) => { // site
                let minusUnwanted =  data.filter(this.filterUnwantedDataFunctor(plot)),
                    minusSuspect = minusUnwanted.filter(this.filterSuspectSummaryData),
                    filtered = this.filterLqdSummary ? minusSuspect.filter(this.filterLqSiteData) : minusSuspect;
                console.debug(`plot[${plotIndex}] filtered out ${data.length-minusUnwanted.length}/${data.length} unwanted records`);
                console.debug(`plot[${plotIndex}] filtered out ${minusUnwanted.length-minusSuspect.length}/${minusUnwanted.length} suspect records`);
                console.debug(`plot[${plotIndex}] filtered out ${minusSuspect.length-filtered.length}/${minusSuspect.length} LQD records`);
                /*this.filterDisclaimer = (minusSuspect.length !== filtered.length) ?
                    FILTER_LQD_DISCLAIMER : undefined;*/
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
