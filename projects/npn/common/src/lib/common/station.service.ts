import { Injectable } from '@angular/core';
import { NpnServiceUtils } from './npn-service-utils.service';
import { Station } from './station';

@Injectable()
export class StationService {
    constructor(private serviceUtils:NpnServiceUtils){}

    getStation(stationId:number):Promise<Station> {
        // fetching an individual station is rather rare, not using the cache
        // since if a user is poking around how likely is it they will click the same
        // station marker repeatedly?
        return this.serviceUtils.get(this.serviceUtils.apiUrl('/npn_portal/stations/getStationDetails.json'),{ids:`${stationId}`})
            .then((results:Station[]) => results && results.length ? results[0] : null);
    }
}