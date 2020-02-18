import { Component, Input } from '@angular/core';
import { Refuge } from './entity.service';
import { NetworkService, StationAwareVisSelection, Station } from '@npn/common';
import { SelectionGroupMode } from '@npn/common/visualizations/vis-selection';
import { timeHours } from 'd3';

/** 
    Radius Dropdown Options for "Compare refuge data to sites within a radius".
    text is what you want the user to see and value is the real value in the form.
*/
const RADIUS_OPTIONS = [{value:10,text:"10"},{value:25,text:"25"},{value:50,text:"50"}];
const RADIUS_DEFAULT = 0; //The index of the default radius selected when page first loads

@Component({
    selector: 'refuge-visualization-scope-selection',
    template: `
    <mat-radio-group name="visScope" class="vis-scope-input" [(ngModel)]="visScope" (change)="scopeChanged()">
      <mat-radio-button class="vis-scope-radio" [value]="'refuge'">Show data for all sites at "{{refuge.title}}"</mat-radio-button>
      <mat-radio-button class="vis-scope-radio" [value]="'station'">Show data for select sites at "{{refuge.title}}"</mat-radio-button>
      <mat-radio-button class="vis-scope-radio" [value]="'stationGroup'">Compare data for select sites at "{{refuge.title}}"</mat-radio-button>
      <mat-radio-button class="vis-scope-radio" [value]="'outsideGroup'">Compare refuge data to sites within a radius</mat-radio-button>
    </mat-radio-group>
    <hr *ngIf="visScope !== 'refuge'" />
    <mat-form-field *ngIf="visScope === 'outsideGroup'" class="radius-form-field">
        <mat-label>Radius (in miles)</mat-label>
        <mat-select class="vis-scope-input" class="radius-input" [(ngModel)]="radius" (selectionChange)="outsideGroupChange()">
            <mat-option *ngFor="let opt of radiusDropdownOptions" [value]="opt.value">{{opt.text}}</mat-option>
        </mat-select>
    </mat-form-field>   
    <mat-progress-spinner *ngIf="stationFetch" mode="indeterminate"></mat-progress-spinner>
    <div *ngIf="(visScope === 'station' || visScope === 'stationGroup' || visScope === 'outsideGroup')">
    <h3 *ngIf="(visScope === 'outsideGroup')">Select Sites to Exclude</h3>
        <mat-checkbox *ngFor="let s of stations" class="station-input" [(ngModel)]="s.selected" (change)="stationChange()"
            [disabled]="visScope === 'station' && s.selected && selection.stationIds?.length === 1">{{s.station_name}}</mat-checkbox>
    </div>
    <!--<pre *ngIf="selection">{{selection.external | json}}</pre>-->
    `,
    styles: [`
        .vis-scope-input {
          display: inline-flex;
          flex-direction: column;
        }
        .vis-scope-radio {
          margin: 5px;
        }
        .station-input {
            display: block;
            padding-left: 34px;
        },
        .radius-form-field {
            margin:20px 0 20px 0;
        }
        .radius-input {
            width:200px;
        }
    `]
})
export class RefugeVisualizationScopeSelectionComponent {
    @Input()
    selection: StationAwareVisSelection;
    @Input()
    refuge: Refuge;
    radiusDropdownOptions = RADIUS_OPTIONS; 
    radius = RADIUS_OPTIONS[RADIUS_DEFAULT].value;
    visScope: string = 'refuge';
    stationFetch: boolean = false;
    private _stations:Promise<Station []>;
    stations: Station[];
    constructor(private networkService: NetworkService) { }

    ngOnInit() {
        const {selection} = this;
        if(selection.groups && selection.groups.length) {
            // this control is simplistic when it comes to groups, there are only two use cases
            this.visScope = selection.groups[0].mode === SelectionGroupMode.STATION
                ? 'stationGroup'
                : 'outsideGroup';
        } else if (selection.stationIds && selection.stationIds.length) {
            this.visScope = 'station';
        } else {
            this.visScope = 'refuge';
        }
        if(this.visScope !== 'refuge') {
            this.loadStations().then((stations:Station[]) => stations.forEach(s => {
                if(this.visScope === 'station') {
                    s.selected = selection.stationIds.indexOf(s.station_id) !== -1;
                } else if(this.visScope === 'outsideGroup'){
                    s.selected = selection.groups[0].excludeIds.indexOf(s.station_id) !== -1;
                } else {
                    s.selected = !!selection.groups.reduce((found,g) => (found||(g.id === s.station_id ? s : undefined)),undefined);
                }
            }));
            if(this.visScope === 'outsideGroup'){
                this.radius = this.selection.groups[1].outsideRadiusMiles 
                          ? this.selection.groups[1].outsideRadiusMiles 
                          : RADIUS_OPTIONS[RADIUS_DEFAULT].value;
            }
        }
    }

    private loadStations() {
        
        if (!this._stations) {
            this.stationFetch = true;
            this._stations = this.networkService.getStations(this.refuge.network_id)
                .then(stations => {
                    this.stations = stations;
                    this.stationFetch = false;
                    return stations;
                });
        }
        return this._stations;
        
    }

    scopeChanged() {
        // reset to a clean slate
        this.selection.stationIds = undefined;
        this.selection.groups = undefined;
        switch (this.visScope) {
            case 'refuge':
                // it's always set and doesn't ever need to change
                // this.selection.networkIds = [this.refuge.network_id];
                break;
            case 'station':
            case 'stationGroup':
            case 'outsideGroup':
                this.loadStations().then((stations:Station[]) => {
                    // all selected for station mode and all de-selected for stationGroup mode
                    stations.forEach(s => s.selected = this.visScope === 'station');
                    if(this.visScope === 'outsideGroup') {
                        this.outsideGroupChange();
                    }
                });
                break;
        }
    }

    outsideGroupChange(){
        let exludeIds = this.stations.filter(s => s.selected).map(s => s.station_id);

        this.selection.groups = [{
            label: this.refuge.title,
            mode: SelectionGroupMode.NETWORK,
            id: this.refuge.network_id,
            excludeIds: exludeIds
          },{
            label: `Sites within ${this.radius} miles`,
            mode: SelectionGroupMode.OUTSIDE,
            id: this.refuge.network_id,
            outsideRadiusMiles: this.radius
          }]; 
    }

    stationChange() {
        switch(this.visScope) {
            case 'station':
                this.selection.stationIds = this.stations.filter(s => s.selected).map(s => s.station_id);
                break;
            case 'stationGroup':
                const mode:SelectionGroupMode = SelectionGroupMode.STATION;
                this.selection.groups = this.stations
                    .filter(s => s.selected)
                    .map(s => {
                        const label = s.station_name;
                        const id = s.station_id;
                        return {mode,id,label};
                    });
                break;
            case 'outsideGroup':
                this.outsideGroupChange();
                break;
        }
    }

    get valid():boolean {
        return this.visScope !== 'stationGroup' || !!(this.selection.groups && this.selection.groups.length);
    }
}
