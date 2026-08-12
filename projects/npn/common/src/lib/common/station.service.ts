import { Injectable } from '@angular/core';
import { NpnServiceUtils } from './npn-service-utils.service';
import { ProgramService } from './program.service';
import { Station } from './station';

@Injectable()
export class StationService {
    constructor(private serviceUtils:NpnServiceUtils,
                private programService:ProgramService){}

    /**
     * A single site by id, or null if there is no such site.
     *
     * `{servicesApiRoot}/v1/sites/{id}` replaces the legacy
     * `/npn_portal/stations/getStationDetails.json?ids=`, which returned a one-element
     * array of PascalCase keys (`Site_Name`, `Latitude`) that never matched what the
     * consuming templates read -- so the station block in the map info window rendered
     * blank. The v1 response is snake_case and `site_name`/`latitude`/`longitude` bind
     * directly.
     *
     * The raw body is spread through before the mapped names are applied, so fields
     * added to the endpoint later (e.g. `num_individuals`/`num_records`) reach templates
     * without another change here.
     *
     * Still uncached, per the original reasoning: how likely is a user to click the same
     * marker twice? The program lookup behind `group_name` is cached independently.
     */
    getStation(stationId:number):Promise<Station> {
        if(!this.serviceUtils.config.servicesApiRoot) {
            return Promise.reject(new Error('No sites endpoint configured (servicesApiRoot)'));
        }
        return this.serviceUtils.get(this.serviceUtils.servicesApiUrl(`/v1/sites/${stationId}?include_counts=1`))
            .then(site => site ? this.toStation(site) : null)
            .catch(err => {
                if(err && err.status === 404) {
                    return null;
                }
                throw err;
            });
    }

    /**
     * Maps a v1 site onto `Station`.
     *
     * `station_id`/`station_name`/`network_id` are kept populated because they are
     * required by the interface and are what most `Station` consumers elsewhere read;
     * `site_name` and the rest of the v1 body are left in place for the info windows.
     */
    private toStation(site:any):Promise<Station> {
        const station:Station = {
            ...site,
            station_id: site.site_id,
            station_name: site.site_name,
            site_name: site.site_name,
            network_id: site.program_id,
            latitude: site.latitude,
            longitude: site.longitude
        };
        // `group_name` is displayed by both info windows but the endpoint supplies only
        // `program_id` (null for personal sites), so resolve the name when there is one.
        // A failure here must not cost the caller the site itself.
        return station.network_id
            ? this.programService.getProgram(station.network_id)
                .then(program => {
                    if(program) {
                        station.group_name = program.name;
                    }
                    return station;
                })
                .catch(err => {
                    console.warn(`Unable to look up program ${station.network_id} for site ${station.station_id}`,err);
                    return station;
                })
            : Promise.resolve(station);
    }
}
