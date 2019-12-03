import { Injectable } from '@angular/core';
import { NpnServiceUtils } from './npn-service-utils.service';
import { Station } from './station';
import { Network } from './network';

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
     * Get a single Network by id
     * 
     * @todo unfortunate that this takes a single networkId and yet returns an array, the function should unwrap the response so callers don't have to.
     * 
     * @param networkId The id of the Network to fetch.
     */
    getNetwork(networkId:number): Promise<Network[]> {
        return this.serviceUtils.cachedGet(
            this.serviceUtils.dataApiUrl2(`/v0/networks/${networkId}`)
        );
    }

    /**
     * Get a set of Networks by id.
     * 
     * @param networkIds The networkIds.
     */
    getNetworks(networkIds:number[]): Promise<Network[]> {
        // ARGH there is a service that can do this in one request but the dataApiUrl2 
        // service doesn't do this and we don't yet have a link to the new services (not sure if they should be used)
        // e.g. curl -X GET "https://data-dev.usanpn.org:3004/v0/networks?network_id=295,724" -H "accept: application/json"
        // in a development setup dataApiRoot2 is https://data-dev.usanpn.org/webservices (prefixed with /webservices and no 3004)
        /*
        return this.serviceUtils.cachedGet(
            this.serviceUtils.dataApiUrl2('/v0/networks'),
            {network_id:networkIds.join(',')}
        );*/
        // not re-using the getNetwork function because I think it should be fixed to not return an array
        // but currently fetching the networks with one request per which is less efficient than it could be
        return Promise.all(
            networkIds.map(id => this.serviceUtils.cachedGet(this.serviceUtils.dataApiUrl2(`/v0/networks/${id}`)))
        ).then(results => {
            return results.map(result=>result[0]);
        });
    }
}
