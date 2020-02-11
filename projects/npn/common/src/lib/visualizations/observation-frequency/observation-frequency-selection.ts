import { NpnServiceUtils, NetworkService } from '../../common';
import { StationAwareVisSelection, selectionProperty, GroupHttpParams } from '../vis-selection';
import { HttpParams } from '@angular/common/http';

export interface ObservationFrequencyData {
    /** The label for the data set. */
    label: string;
    /** The corresponding year. */
    year: number;
    /** Array of 12 (0=Jan,11=Dec) */
    months: number[];
}

interface SiteVisitFreqStation {
    months: number[];
    station_name: string;
    station_id: number;
}
interface SiteVisitFreq {
    year: number;
    station_ids: number[];
    network_name: string;
    stations: SiteVisitFreqStation[];
}
/**
 * @dynamic
 */
export class ObservationFrequencySelection extends StationAwareVisSelection {
    @selectionProperty()
    $class:string = 'ObservationFrequencySelection';

    @selectionProperty()
    $entity:any;

    @selectionProperty()
    year:number;

    constructor(protected serviceUtils:NpnServiceUtils,protected networkService: NetworkService) {
        super(serviceUtils,networkService);
    }

    isValid():boolean {
        return !!this.year && this.networkIds.length > 0;
    }

    toURLSearchParams(params: HttpParams = new HttpParams()): Promise<HttpParams> {
        return super.toURLSearchParams(params.set('year',`${this.year}`));
    }

    getData():Promise<ObservationFrequencyData []> {
        const url = this.serviceUtils.apiUrl('/npn_portal/networks/getSiteVisitFrequency.json');
        const rollup = (data:SiteVisitFreq,label:string):ObservationFrequencyData => {
            const year = data.year;
            const months:number[] = data.stations.reduce((months:number[],station:SiteVisitFreqStation) => {
                station.months.forEach((m,i) => months[i] += m);
                return months;
            },[0,0,0,0,0,0,0,0,0,0,0,0]);
            return {label,year,months};
        };
        this.working = true;
        if(!this.$entity) {
            // the selection was created before the phenology trails work and must just contain a single network id
            // for a refuge, chase it to get the label for the visualization and then the data....
            return this.serviceUtils.cachedGet(url,{year: this.year,network_id:this.networkIds[0]})
                .then((result:SiteVisitFreq) => {
                    this.working = false;
                    return [rollup(result,result.network_name)];
                });
        }
        return this.toURLSearchParams()
            .then(baseParams => {
                if(this.groups && this.groups.length) {
                    return this.toGroupHttpParams(baseParams)
                        .then((groupParams:GroupHttpParams[]) => Promise.all(
                                groupParams.map(gp =>this.serviceUtils.cachedPost(url,gp.params.toString())
                                    .then((result:SiteVisitFreq) => rollup(result,gp.group.label)))
                            ).then(data => {
                                this.working = false;
                                return data;
                            }));
                }
                return this.serviceUtils.cachedPost(url,baseParams.toString())
                    .then((result:SiteVisitFreq) => {
                        this.working = false;
                        let label = this.$entity.title;
                        if(this.stationIds && this.stationIds.length) {
                            // refuge, subset of stations
                            label += ' (select stations)';
                        } else if (this.$entity.network_ids && this.networkIds.length !== this.$entity.network_ids.length) {
                            // phenology trail, subset of groups
                            label += ' (select groups)';
                        }
                        return [rollup(result,label)];
                    });
            });
    }
}
