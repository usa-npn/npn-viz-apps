import {NpnServiceUtils, NetworkService} from '../../common';
import {NetworkAwareVisSelection,selectionProperty} from '../vis-selection';

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

export class ObserverActivitySelection extends NetworkAwareVisSelection {
    @selectionProperty()
    $class:string = 'ObserverActivitySelection';

    @selectionProperty()
    year:number;

    constructor(protected serviceUtils:NpnServiceUtils,protected networkService:NetworkService) {
        super(networkService);
    }

    isValid():boolean {
        return !!this.year;
    }

    getData():Promise<ObserverActivityData[]> {
        // /npn_portal/networks/getObserversByMonth.json?year=2015&network_id=69
        let url = this.serviceUtils.apiUrl('/npn_portal/networks/getObserversByMonth.json'),
            params = {
                year: this.year,
                network_id: this.networkIds[0]
            };
        // pulls data for a given month from a server response
        const dataForMonth = (month:number,data:any):ObserverActivityMonth => ({
            month,
            newObservers: data.months[month].new_observers.length,
            activeObservers: data.months[month].active_observers.length
        });
        // TODO is at the moment always just a single set of data...
        return new Promise((resolve,reject) => {
            this.working = true;
            this.serviceUtils.cachedGet(url,params)
                .then(data => {
                    // group label or?
                    data.label = `TODO: ${data.network_name}`;
                    data.months = [1,2,3,4,5,6,7,8,9,10,11,12].map(i => dataForMonth(i,data));
                    this.working = false;
                    // TODO temporarily to give multiple stacks
                    const d = data as ObserverActivityData;
                    resolve([d,d]);
                })
                .catch(reject);
        });
    }
}
