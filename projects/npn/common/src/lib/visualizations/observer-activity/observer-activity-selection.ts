import { NpnServiceUtils, NetworkService } from '../../common';
import { selectionProperty, StationAwareVisSelection, GroupHttpParams } from '../vis-selection';
import { HttpParams } from '@angular/common/http';

export interface ObserverActivityMonth {
    /** Month (1-12) */
    month:number;
    /** Number of new observers */
    newObservers:number;
    /** Number of active observers */
    activeObservers:number;
}

export interface ObserverActivityData {
    /** The label for the data set. */
    label: string;
    /** The corresponding year. */
    year: number;
    /** Array of 12 (ordered) */
    months: ObserverActivityMonth[];
    // TODO how do we label a non-grouped data set....
    // previously simply relied on network_name as returned by the server....
}

export class ObserverActivitySelection extends StationAwareVisSelection {
    @selectionProperty()
    $class:string = 'ObserverActivitySelection';

    @selectionProperty()
    $entity:any;

    @selectionProperty()
    year:number;

    constructor(protected serviceUtils:NpnServiceUtils,protected networkService:NetworkService) {
        super(serviceUtils,networkService);
    }

    isValid():boolean {
        return !!this.year;
    }

    toURLSearchParams(params: HttpParams = new HttpParams()): Promise<HttpParams> {
        return super.toURLSearchParams(params.set('year',`${this.year}`));
    }

    getData():Promise<ObserverActivityData[]> {
        const url = this.serviceUtils.apiUrl('/npn_portal/networks/getObserversByMonth.json');
        // pulls data for a given month from a server response
        const dataForMonth = (month:number,data:any):ObserverActivityMonth => ({
            month,
            newObservers: data.months[month].new_observers.length,
            activeObservers: data.months[month].active_observers.length
        });
        this.working = true;
        // if $entity is not set then this selection was created prior to the phenology trail
        // work and so needs to behave as it did previously, only single network id, etc.
        if(!this.$entity) {
            return this.serviceUtils.cachedGet(url,{year: this.year,network_id: this.networkIds[0]})
                .then(data => {
                    this.working = false;
                    data.label = `${data.network_name}`;
                    data.months = [1,2,3,4,5,6,7,8,9,10,11,12].map(i => dataForMonth(i,data));
                    const d = data as ObserverActivityData;
                    return [d];
                });
        }
        // $entity is set this is a new selection that can deal with
        return this.toURLSearchParams()
            .then(baseParams => {
                if(this.groups && this.groups.length) {
                    return this.toGroupHttpParams(baseParams)
                        .then((groupParams:GroupHttpParams[]) => Promise.all(
                            groupParams.map(gp => this.serviceUtils.cachedPost(url,gp.params.toString())
                                .then(data => {
                                    data.label = gp.group.label;
                                    data.months = [1,2,3,4,5,6,7,8,9,10,11,12].map(i => dataForMonth(i,data));
                                    const d = data as ObserverActivityData;
                                    return d;
                                }))
                        )).then((results:ObserverActivityData[]) => {
                            this.working = false;
                            return results;
                        })
                }
                // a single data set
                return this.serviceUtils.cachedPost(url,baseParams.toString())
                    .then(data => {
                        this.working = false;
                        let label = this.$entity.title;
                        if(this.stationIds && this.stationIds.length) {
                            // refuge, subset of stations
                            label += ' (select stations)';
                        } else if (this.$entity.network_ids && this.networkIds.length !== this.$entity.network_ids.length) {
                            // phenology trail, subset of groups
                            label += ' (select groups)';
                        }
                        data.label = label;
                        data.months = [1,2,3,4,5,6,7,8,9,10,11,12].map(i => dataForMonth(i,data));
                        const d = data as ObserverActivityData;
                        return [d];
                    });
            });
    }
}
