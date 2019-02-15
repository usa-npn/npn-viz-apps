import { Component, Input, SimpleChanges } from '@angular/core';
import { MapVisMarker, MAP_VIS_SVG_PATHS } from './map-visualization.component';
import { Station } from '../../common';
import { GriddedPointData, DefaultMapLayerLegend } from '../../gridded';
import { StationService } from '@npn/common/common/station.service';
import { MapSelection } from './map-selection';

@Component({
    selector: 'map-visualization-marker-iw',
    template: `
    <npn-logo spin="true" *ngIf="!station; else stationInfo"></npn-logo>
    <ng-template #stationInfo>
        <div class="station-info">
            <h3>{{station.site_name}}</h3>
            <ul>
            <li *ngIf="station.group_name"><label>Group:</label> {{station.group_name}}</li>
            <li><label>Latitude:</label> {{station.latitude}} <label>Longitude:</label> {{station.longitude}}</li>
            <li *ngIf="data && data.legendData" class="gridded-data"><label>Gridded Layer Value:</label> <div class="legend-cell"
                [ngStyle]="{'background-color': data.legendData.color}">&nbsp;</div> {{data.point | number}} ({{data.formatted}})</li>
            </ul>
        </div>
        <div class="record-info" *ngFor="let r of marker.records">
            <h4>{{r | speciesTitle}}, {{r.phenophase_description}}, {{r.mean_first_yes_year}}
                <svg class="icon" viewBox="0 0 22 22">
                    <path [attr.fill]="iconFill(r)" [attr.d]="svgs[r.species_id]" stroke='#000'></path>
                </svg></h4>
            <ul>
            <li><label>Observed Day of Onset:</label> {{r.mean_first_yes_doy | number:'1.0-0'}} ({{selection.legend.formatPointData(r.mean_first_yes_doy)}})<span *ngIf="r.sd_first_yes_in_days > 0"> [Standard Deviation: {{r.sd_first_yes_in_days | number:'1.1-1'}}]</span></li>
            </ul>
        </div>
    </ng-template>
    `,
    styles:[`
    npn-logo {
        width: 25px;
        height: 25px;
    }
    svg {
        border: none;
        width: 16px;
        height: 16px;
    }
    .legend-cell {
        width: 15px;
        height: 15px;
        border: 1px solid black;
        display: inline-block;
        margin: 0 5px;
    }
    ul {
        margin: 0px;
        padding: 0px 0px 0px 5px;
    }
    ul > li {
        list-style: none;
        padding: 2px 0px;
    }
    label {
        font-weight: bold;
    }
    h3,
    h4 {
        text-transform: none !important;
    }
    h3 {
        margin: 0 0 8px !important;
    }
    h4 {
        margin: 5px 0px !important;
    }
    li.gridded-data {
        display:flex;
        align-items: center;
    }
    `]
})
export class MapVisualizationMarkerIw {
    @Input() marker:MapVisMarker;
    @Input() selection:MapSelection;

    station:Station;
    data:GriddedPointData;
    svgs:any;

    constructor(
        private stationService:StationService
    ) {}

    ngOnChanges(changes: SimpleChanges):void {
        if(changes.marker) {
            this.station = null;
            this.data = null;
            if(this.marker) {
                this.marker.records.forEach(r => {
                    console.log('POINT DATA',this.selection.legend.getPointData(r.mean_first_yes_doy));
                })
                this.svgs = this.selection.validPlots.reduce((map,plot,i) => {
                        map[plot.species.species_id] = MAP_VIS_SVG_PATHS[i];
                        return map;
                    },{});
                const {legend} = this.selection;
                Promise.all([
                    this.stationService.getStation(this.marker.site_id),
                    (legend && !(legend instanceof DefaultMapLayerLegend)) ?
                        legend.getGriddedPointData(new google.maps.LatLng(this.marker.latitude,this.marker.longitude)).toPromise()
                        : Promise.resolve(null)
                ]).then(results => {
                    console.log('MapVisualizationMarkerIw:results',results);
                    const [station,data] = results;
                    this.station = station;
                    this.data = data;
                });
            }
        }
    }

    iconFill(r) {
        const data = this.selection.legend.getPointData(r.mean_first_yes_doy);
        return data
            ? data.color
            : '#ffffff';
    }
}

