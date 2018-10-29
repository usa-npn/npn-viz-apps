import {NpnServiceUtils} from '../../common';
import {NetworkAwareVisSelection,selectionProperty} from '../vis-selection';

export class ObserverActivitySelection extends NetworkAwareVisSelection {
    @selectionProperty()
    $class:string = 'ObserverActivitySelection';

    @selectionProperty()
    year:number;

    constructor(protected serviceUtils:NpnServiceUtils) {
        super();
    }

    isMultiStation():boolean {
        return this.stationIds && this.stationIds.length > 1;
    }

    isSingleStation():boolean {
        return this.stationIds && this.stationIds.length === 1;
    }

    isValid():boolean {
        return !!this.year;
    }

    dataCnt:number = 0;
    getData():Promise<any> {
        // /npn_portal/networks/getObserversByMonth.json?year=2015&network_id=69
        let url = this.serviceUtils.apiUrl('/npn_portal/networks/getObserversByMonth.json'),
            params = {
                year: this.year,
                network_id: this.networkIds[0]
            };
        return new Promise((resolve,reject) => {
            this.working = true;
            this.serviceUtils.cachedGet(url,params)
                .then(data => {
                    let months = [1,2,3,4,5,6,7,8,9,10,11,12].map(i => {
                        return {...{month:i},...data.months[i]};
                    });
                    data.months = months;
                    this.working = false;
                    resolve(data);
                })
                .catch(reject);
        });
    }
}
