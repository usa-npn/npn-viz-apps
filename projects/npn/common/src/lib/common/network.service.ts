import { Injectable } from '@angular/core';
import { NpnServiceUtils } from './npn-service-utils.service';
import { Station } from './station';

/**
 * Station lookups scoped by network id.
 *
 * Looking up the networks themselves now lives in `ProgramService` -- the domain calls
 * them programs, and `{servicesApiRoot}/v1/programs` replaced the `/v0/networks`
 * endpoints this used to own. What remains here still speaks "network" because the
 * endpoints it calls do: `getAllStations.json` takes `network_ids[n]` parameters.
 */
@Injectable()
export class NetworkService {

    constructor(private serviceUtils:NpnServiceUtils) {}

    /**
     * Get all stations for a network or list of networks.
     * 
     * @param networkIds A single networkId or an array of networkIds.
     */
    getStations(networkIds:number|number[]): Promise<Station[]> {
        const ids:number[] = Array.isArray(networkIds) ? networkIds : [networkIds];
        const params = ids.reduce((map,id,i) => {
                map[`network_ids[${i}]`] = id;
                return map;
            },{});
        return this.serviceUtils.cachedGet(
            this.serviceUtils.apiUrl('/npn_portal/stations/getAllStations.json'),
            params
        );
    }

    /**
     * Get station ids nearby to a network (functional for only networks with boundaries).
     * 
     * @param networkId A single networkId
     * @param radius The radius to constrain the results by.
     */
    getNearbyStationIds(networkId:number,radius:number):Promise<number []> {
        return this.serviceUtils.cachedGet(
            this.serviceUtils.dataApiUrl2(`/v0/stations/nearby_stations/${networkId}/${radius}`)
        ).then(response => response.Station_IDs);
    }

}
