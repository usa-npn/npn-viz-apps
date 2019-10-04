import { Injectable } from '@angular/core';
import { NpnServiceUtils } from './npn-service-utils.service';

@Injectable()
export class NetworkService {

    constructor(private serviceUtils:NpnServiceUtils) {}

    getStations(networkId): Promise<any[]> {
        return this.serviceUtils.cachedGet(
            this.serviceUtils.apiUrl('/npn_portal/stations/getStationsForNetwork.json'),
            { network_id: networkId }
        );
    }

    getNetwork(networkId): Promise<any[]> {
        return this.serviceUtils.cachedGet(
            this.serviceUtils.dataApiUrl2(`/v0/networks/${networkId}`)
        );
    }
}
