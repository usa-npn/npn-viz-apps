import { Component, OnInit, Input } from '@angular/core';
import { I18nPluralPipe } from '@angular/common';
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
    [iconUrl]="purpleMarker"
    ></agm-marker>
    <agm-info-window *ngIf="griddedLoading"
                    [isOpen]="griddedOpen"
                    (infoWindowClose)="griddedOpen = false"
                    [latitude]="griddedLat" [longitude]="griddedLng">
                    <npn-logo class="in-info-window" spin="true"></npn-logo>
    </agm-info-window>
    <agm-info-window [isOpen]="!!selectedMarker" (infoWindowClose)="selectedMarker = null"
    [latitude]="selectedMarker?.latitude" [longitude]="selectedMarker?.longitude" *ngIf="selectedMarker">
        <div class="info-window-card">
            <h1>{{selectedMarker.site_name}}</h1>
            <h2>{{selectedMarker.group_name}}</h2>
            <ul>
                <li><h1>{{selectedMarker.num_individuals}}</h1> {{selectedMarker.num_individuals | i18nPlural: itemPluralMapping['individual'] }}</li>
                <li><h1>{{selectedMarker.num_records}}</h1> {{selectedMarker.num_records | i18nPlural: itemPluralMapping['record']}}</li>
            </ul>
        </div>
    </agm-info-window>
    
  </agm-map>
  `,
  styleUrls: ['./phenology-trail-partners.component.scss']
})
export class PhenologyTrailPartnersComponent implements OnInit {
    @Input() entity:PhenologyTrail;
    networks:Promise<Network[]>;
    stations:Promise<Station[]>;
    lat = 35;
    lng = -106.2615581;
    selectedMarker;
    itemPluralMapping = {
        'record': {
          '=0' : 'Records',
          '=1' : 'Record',
          'other' : 'Records'
        }, 
        'individual': {
          '=0' : 'Individuals',
          '=1' : 'Individual',
          'other' : 'Individuals'
        }
      };
    griddedLat:number;
    griddedLng:number;
    griddedOpen:boolean = false;
    //griddedData:GriddedPointData;
    griddedLoading:boolean = false;
    greenMarker = 'https://www.google.com/intl/en_us/mapfiles/ms/micons/green-dot.png';
    yellowMarker = 'https://www.google.com/intl/en_us/mapfiles/ms/micons/yellow-dot.png';
    purpleMarker = 'https://www.google.com/intl/en_us/mapfiles/ms/micons/purple-dot.png';

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
        });
    }
}