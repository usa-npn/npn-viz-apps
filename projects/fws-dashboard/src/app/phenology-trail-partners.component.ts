import { Component, OnInit, Input } from '@angular/core';
import {PhenologyTrail} from './entity.service';
import {Network, Station, NetworkService, StationService, getStaticColor} from '@npn/common';

@Component({
  selector: 'phenology-trail-partners',
  template: `
  <agm-map [latitude]="lat" [longitude]="lng">
    <agm-marker
    *ngFor="let station of stations | async; let i = index"
    [latitude]="station.latitude"
    [longitude]="station.longitude"
    [opacity]="1"
    [markerDraggable]="true"
    (markerClick)="selectMarker(station)"
    [iconUrl]="'https://www.google.com/intl/en_us/mapfiles/ms/micons/purple-dot.png'"
    ></agm-marker>
    <agm-info-window *ngIf="griddedLoading"
                    [isOpen]="griddedOpen"
                    (infoWindowClose)="griddedOpen = false"
                    [latitude]="griddedLat" [longitude]="griddedLng">
                    <npn-logo class="in-info-window" spin="true"></npn-logo>
    </agm-info-window>
    <agm-info-window [isOpen]="!!selectedMarker" (infoWindowClose)="selectedMarker = null"
    [latitude]="selectedMarker?.latitude" [longitude]="selectedMarker?.longitude" *ngIf="selectedMarker">
        <div>
            <h4>{{selectedMarker.site_name}}</h4>
            <p>{{selectedMarker.group_name}}</p>
            <p>Individuals: {{selectedMarker.num_individuals}}</p>
            <p>Records: {{selectedMarker.num_records}}</p>
        </div>
    </agm-info-window>
    
  </agm-map>
  `,
  styles: [`
    agm-map {
        height: 500px;
    }
    .in-info-window {
        width: 60px;
        height: 60px;
        padding:20px;
    }`]
})
export class PhenologyTrailPartnersComponent implements OnInit {
    @Input() entity:PhenologyTrail;
    networks:Promise<Network[]>;
    stations:Promise<Station[]>;
    lat = 35;
    lng = -106.2615581;
    selectedMarker;

    griddedLat:number;
    griddedLng:number;
    griddedOpen:boolean = false;
    //griddedData:GriddedPointData;
    griddedLoading:boolean = false;

    constructor(
        private networkService:NetworkService,
        private stationService:StationService
        )  { }

    ngOnInit() {
        // map of network_id to a color
        const colorMap:any = this.entity.network_ids.reduce((map,id,i) => {
            map[`${id}`] = getStaticColor(i);
            return map;
        },{});

        const mapColors = list => list.map(o => {
            o.color = colorMap[`${o.network_id}`];
            return o;
        });

        this.networks = this.networkService.getNetworks(this.entity.network_ids);
        this.stations = this.networkService.getStations(this.entity.network_ids).then(mapColors);
        console.log(this.networks);
        console.log(this.stations);
    }

    /**
     * Get the station information for display in the agm-info-window
     * @param selectedStation - The station that is selected. Needs latitude, longitude, and station_id
     */
    selectMarker(selectedStation:Station) {
        this.griddedLoading = true;
        this.griddedLat = selectedStation.latitude;
        this.griddedLng = selectedStation.longitude;
        //this.griddedData = null;
        this.griddedOpen = true;
        this.stationService.getStation(selectedStation.station_id).then(station =>{
            this.selectedMarker = station;
            this.griddedLoading = false;
        })
      }
}