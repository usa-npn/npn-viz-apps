import { HttpParams } from '@angular/common/http';
import { APPLICATION_SETTINGS, NpnServiceUtils } from '../common';
import { StationAwareVisSelection, selectionProperty } from './vis-selection';

const FILTER_LQD_DISCLAIMER = 'For quality assurance purposes, only onset dates that are preceded by negative records are included in the visualization.';

export abstract class SiteOrSummaryVisSelection extends StationAwareVisSelection {
    @selectionProperty()
    individualPhenometrics: boolean = false;
    @selectionProperty()
    filterDisclaimer: string;

    constructor(protected serviceUtils:NpnServiceUtils) {
        super(serviceUtils);
    }

    abstract toURLSearchParams(): Promise<HttpParams>;

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
                    filtered = APPLICATION_SETTINGS.filterLqdSummary ? minusSuspect.filter(this.filterLqSummaryData) : minusSuspect,
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
                    filtered = APPLICATION_SETTINGS.filterLqdSummary ? minusSuspect.filter(this.filterLqSiteData) : minusSuspect;
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
