import {NpnServiceUtils,NetworkService} from '../../common';
import {NetworkAwareVisSelection,selectionProperty} from '../vis-selection';

/**
 * @dynamic
 */
export class ObservationFrequencySelection extends NetworkAwareVisSelection {
    @selectionProperty()
    $class:string = 'ObservationFrequencySelection';

    @selectionProperty()
    _year:number;
    @selectionProperty()
    defaultStation:number;

    constructor(protected serviceUtils:NpnServiceUtils,protected networkService: NetworkService) {
        super();
    }

    set year(y:number) {
        this._year = y;
        delete this.defaultStation; // reset default station if there is one.
    }

    get year():number {
        return this._year;
    }

    isValid():boolean {
        return !!this.year && this.networkIds.length === 1;
    }

    dataCnt:number = 0;
    getData():Promise<any> {
        return new Promise((resolve,reject) => {
            let url = this.serviceUtils.apiUrl('/npn_portal/networks/getSiteVisitFrequency.json'),
                params = {
                    year: this.year,
                    network_id: this.networkIds[0]
                };
            this.working = true;
            this.serviceUtils.cachedGet(url,params)
                .then(data => {
                    this.working = false;
                    resolve(data);
                })
                .catch(reject);
        });
    }
}
