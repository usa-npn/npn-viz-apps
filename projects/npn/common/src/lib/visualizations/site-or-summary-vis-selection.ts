import { HttpParams } from '@angular/common/http';
import { NpnServiceUtils } from '../common';
import { StationAwareVisSelection, selectionProperty } from './vis-selection';
import { PARAMETERS } from '@angular/core/src/util/decorators';

const FILTER_LQD_DISCLAIMER = 'For quality assurance purposes, only onset dates that are preceded by negative records are included in the visualization.';
const DEFAULT_NUM_DAYS_Q_FILTER = 30;

export abstract class SiteOrSummaryVisSelection extends StationAwareVisSelection {
    @selectionProperty()
    individualPhenometrics: boolean = false;
    @selectionProperty()
    filterDisclaimer: string;
    @selectionProperty()
    _filterLqdSummary: boolean = true;
    @selectionProperty()
    _numDaysQualityFilter:number = DEFAULT_NUM_DAYS_Q_FILTER;

    constructor(protected serviceUtils:NpnServiceUtils) {
        super(serviceUtils);
    }

    toURLSearchParams(): Promise<HttpParams> {
        let params = new HttpParams();
        if(this.numDaysQualityFilter) {
            params = params.set('num_days_quality_filter',`${this.numDaysQualityFilter}`)
        }
        return Promise.resolve(params);
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

    getData(): Promise<any[]> {
        if (!this.isValid()) {
            return Promise.reject(this.INVALID_SELECTION);
        }
        const url = this.serviceUtils.apiUrl(`/npn_portal/observations/${this.individualPhenometrics ? 'getSummarizedData' : 'getSiteLevelData'}.json`);
        const filterLqd = this.individualPhenometrics
            ? (data) => { // summary
                let minusSuspect = data.filter(this.filterSuspectSummaryData),
                    filtered = this.filterLqdSummary ? minusSuspect.filter(this.filterLqSummaryData) : minusSuspect,
                    individuals = filtered.reduce(function (map, d) {
                        var key = d.individual_id + '/' + d.phenophase_id + '/' + d.first_yes_year;
                        map[key] = map[key] || [];
                        map[key].push(d);
                        return map;
                    }, {}),
                    uniqueIndividuals = [];
                console.debug('filtered out ' + (data.length - minusSuspect.length) + '/' + data.length + ' suspect records');
                console.debug('filtered out ' + (minusSuspect.length - filtered.length) + '/' + minusSuspect.length + ' LQD records.');
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

                this.filterDisclaimer = (minusSuspect.length !== filtered.length) ? FILTER_LQD_DISCLAIMER : undefined;
                return filtered;
            }
            : (data) => { // site
                let minusSuspect = data.filter(this.filterSuspectSummaryData),
                    filtered = this.filterLqdSummary ? minusSuspect.filter(this.filterLqSiteData) : minusSuspect;
                console.debug('filtered out ' + (data.length - minusSuspect.length) + '/' + data.length + ' suspect records');
                console.debug('filtered out ' + (minusSuspect.length - filtered.length) + '/' + minusSuspect.length + ' LQD records.');
                this.filterDisclaimer = (minusSuspect.length !== filtered.length) ?
                    FILTER_LQD_DISCLAIMER : undefined;
                return filtered;
            };
        this.working = true;
        return this.toURLSearchParams()
            .then(params => this.serviceUtils.cachedPost(url,params.toString())
            .then((arr:any[]) => {
                this.working = false;
                return filterLqd(arr);
            })
            .catch(err => {
                this.working = false;
                this.handleError(err);
            }));
    }
}
