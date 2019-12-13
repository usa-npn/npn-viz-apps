import { Component, Input } from '@angular/core';
import { Refuge } from './entity.service';
import { NetworkService, StationAwareVisSelection, Station } from '@npn/common';
import { SelectionGroupMode } from '@npn/common/visualizations/vis-selection';

@Component({
    selector: 'refuge-visualization-scope-selection',
    template: `
    <mat-radio-group name="visScope" class="vis-scope-input" [(ngModel)]="visScope" (change)="scopeChanged()">
      <!--mat-radio-button class="vis-scope-radio" [value]="'all'">No restrictions</mat-radio-button-->
      <mat-radio-button class="vis-scope-radio" [value]="'refuge'">Show data for all sites at "{{refuge.title}}"</mat-radio-button>
      <mat-radio-button class="vis-scope-radio" [value]="'station'">Show data for select sites at "{{refuge.title}}"</mat-radio-button>
      <mat-radio-button class="vis-scope-radio" [value]="'stationGroup'">Compare data for select sites at "{{refuge.title}}"</mat-radio-button>
    </mat-radio-group>
    <mat-progress-spinner *ngIf="stationFetch" mode="indeterminate"></mat-progress-spinner>
    <div *ngIf="(visScope === 'station' || visScope === 'stationGroup')">
        <mat-checkbox *ngFor="let s of stations" class="station-input" [(ngModel)]="s.selected" (change)="stationChange()">{{s.station_name}}</mat-checkbox>
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
    scopeChanged() {
        // reset to a clean slate
        delete this.selection.networkIds;
        delete this.selection.stationIds;
        delete this.selection.groups;
        switch (this.visScope) {
            case 'all':
                break;
            case 'refuge':
                this.selection.networkIds = [this.refuge.network_id];
                break;
            case 'station':
            case 'stationGroup':
                this.selection.networkIds = [this.refuge.network_id];
                if (!this._stations) {
                    this.stationFetch = true;
                    this._stations = this.networkService.getStations(this.refuge.network_id)
                        .then(stations => {
                            this.stationFetch = false;
                            return stations;
                        });
                }
                this._stations.then((stations:Station[]) => {
                    // all selected for station mode and all de-selected for stationGroup mode
                    stations.forEach(s => s.selected = this.visScope === 'station');
                    this.stations = stations;
                });
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
        }
    }

    get valid():boolean {
        return this.visScope !== 'stationGroup' || !!(this.selection.groups && this.selection.groups.length);
    }
}
