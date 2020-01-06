import { Component, Input } from '@angular/core';
import { Refuge } from './entity.service';
import { NetworkService, StationAwareVisSelection, Station } from '@npn/common';
import { SelectionGroupMode } from '@npn/common/visualizations/vis-selection';

@Component({
    selector: 'refuge-visualization-scope-selection',
    template: `
    <mat-radio-group name="visScope" class="vis-scope-input" [(ngModel)]="visScope" (change)="scopeChanged()">
      <mat-radio-button class="vis-scope-radio" [value]="'refuge'">Show data for all sites at "{{refuge.title}}"</mat-radio-button>
      <mat-radio-button class="vis-scope-radio" [value]="'station'">Show data for select sites at "{{refuge.title}}"</mat-radio-button>
      <mat-radio-button class="vis-scope-radio" [value]="'stationGroup'">Compare data for select sites at "{{refuge.title}}"</mat-radio-button>
    </mat-radio-group>
    <hr *ngIf="visScope !== 'refuge'" />
    <mat-progress-spinner *ngIf="stationFetch" mode="indeterminate"></mat-progress-spinner>
    <div *ngIf="(visScope === 'station' || visScope === 'stationGroup')">
        <mat-checkbox *ngFor="let s of stations" class="station-input" [(ngModel)]="s.selected" (change)="stationChange()"
            [disabled]="visScope === 'station' && s.selected && selection.stationIds?.length === 1">{{s.station_name}}</mat-checkbox>
    </div>
    <!--pre *ngIf="selection">{{selection.external | json}}</pre-->
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
        }
    `]
})
export class RefugeVisualizationScopeSelectionComponent {
    @Input()
    selection: StationAwareVisSelection;
    @Input()
    refuge: Refuge;
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
                } else {
                    s.selected = !!selection.groups.reduce((found,g) => (found||(g.id === s.station_id ? s : undefined)),undefined);
                }
            }));
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
                });
                if(this.visScope === 'outsideGroup') {
                    // TODO populate selection.groups
                }
                break;
        }
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
                // TODO
                break;
        }
    }

    get valid():boolean {
        return this.visScope !== 'stationGroup' || !!(this.selection.groups && this.selection.groups.length);
    }
}
