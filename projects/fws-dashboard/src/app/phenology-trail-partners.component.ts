import { Component, OnInit, Input, ViewChild, HostListener } from '@angular/core';
import { PhenologyTrail } from './entity.service';
import { Network, Station, NetworkService, StationService, getStaticColor, MAP_STYLES } from '@npn/common';
import { MapsAPILoader, AgmMap } from '@agm/core';
import * as d3 from 'd3';

@Component({
  selector: 'phenology-trail-partners',
  template: `
  <agm-map #AgmMap [streetViewControl]="false" [scrollwheel]="false" [styles]="mapStyles">
    <agm-marker
        *ngFor="let station of stations | async; let i = index"
        [latitude]="station.latitude"
        [longitude]="station.longitude"
        [iconUrl]="station.icon"
        (markerClick)="selectMarker(station)"
    ></agm-marker>
    <agm-info-window [isOpen]="!!selectedStation" (infoWindowClose)="selectedStation = stationInfo = null"
    [latitude]="selectedStation?.latitude" [longitude]="selectedStation?.longitude">
        <npn-logo class="in-info-window" spin="true" *ngIf="!stationInfo"></npn-logo>
        <div class="info-window-card" *ngIf="stationInfo">
            <h3>{{stationInfo.site_name}}</h3>
            <h4>{{stationInfo.group_name}}</h4>
            <ul>
                <li><h3>{{stationInfo.num_individuals}}</h3> {{stationInfo.num_individuals | i18nPlural: itemPluralMapping['individual'] }}</li>
                <li><h3>{{stationInfo.num_records}}</h3> {{stationInfo.num_records | i18nPlural: itemPluralMapping['record']}}</li>
            </ul>
        </div>
    </agm-info-window>
    
  </agm-map>
  <div class="map-legend">
    <h3>Legend</h3>
    <ul>
        <ng-container *ngFor="let network of networks | async; let i = index">
            <li *ngIf="!!network"><div class="legend-box" [style.background-color]="network.colors?.color"></div> {{network.name}}</li>
        </ng-container>
    </ul>
  </div>
  `,
  styleUrls: ['./phenology-trail-partners.component.scss']
})
export class PhenologyTrailPartnersComponent implements OnInit {
    @ViewChild('AgmMap') agmMap: AgmMap;
    @Input() entity:PhenologyTrail;
    networks:Promise<Network[]>;
    stations:Promise<Station[]>;
    selectedStation:Station;
    stationInfo:Station;

    bounds:google.maps.LatLngBounds;
    map: google.maps.Map;
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
    mapStyles: any[] = MAP_STYLES;

    constructor(
        private networkService:NetworkService,
        private stationService:StationService,
        private mapsAPILoader:MapsAPILoader
        )  { }

    ngOnInit() {
        // map of network_id to a color
        const colorMap:any = this.entity.network_ids.reduce((map,id,i) => {
            const color = getStaticColor(i);
            const outline = d3.color(color).darker().toString();
            map[`${id}`] = {color,outline};
            return map;
        },{});

        const mapColors = list => list.map(o => {
            o.colors = colorMap[`${o.network_id}`];
            return o;
        });

        this.networks = this.networkService.getNetworks(this.entity.network_ids).then(mapColors);
        this.stations = this.networkService.getStations(this.entity.network_ids).then(mapColors).then(stations => {
            return this.mapsAPILoader.load().then( () => {
                stations.forEach(station => {
                    station.icon = this.newGoogleMapsSymbol(station);
                });
                return stations;
            });
            
        });
    }

    ngAfterViewInit() {
        //cycle through the map elements and get the center position of the map
        this.agmMap.mapReady.subscribe(map => {
          this.map = map;
          this.stations.then(stations => {
            const bounds = new google.maps.LatLngBounds();
            for (const mm of stations) {
                bounds.extend(new google.maps.LatLng(mm.latitude, mm.longitude));
            }
            this.bounds = bounds;
            this.resize();
          });
        });
      }

    @HostListener('window:resize') 
    resize(){
        if(this.map && this.bounds){
            this.map.fitBounds(this.bounds);
        }
    }

    /**
     * Get the station information for display in the agm-info-window
     * @param selectedStation - The station that is selected. Needs latitude, longitude, and station_id
     */
    selectMarker(selectedStation:Station) {
        this.selectedStation = selectedStation;
        this.stationService.getStation(selectedStation.station_id).then(station => this.stationInfo = station);
    }

    newGoogleMapsSymbol(station:Station):google.maps.Symbol {
        return {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillOpacity: 1,
            fillColor: station.colors.color,
            strokeColor: station.colors.outline,
            strokeWeight:1
        };
    }
}