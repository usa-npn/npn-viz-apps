import { Input, Component } from '@angular/core';
import { StationAwareVisSelection } from '@npn/common/visualizations/vis-selection';
import { NetworkWrapper } from './pheno-trail-visualization-scope-selection.component';

@Component({
    selector: 'pheno-trail-visualization-scope-station-groups',
    template: `
    <h3>Select Sites to Compare</h3>
    <div *ngFor="let nw of networkWrappers">
      {{nw.network.name}}
      <div *ngFor="let s of nw.stations | async" class="station-input">
        <mat-checkbox [(ngModel)]="s.selected" (change)="stationChange()">{{s.station_name}}</mat-checkbox>
      </div>
    </div>
    `,
    styles: [`
      .group-input {
        display:block;
      }
      .station-input {
        display: block;
        padding-left: 34px;
      }
    `]
})
export class PhenoTrailVisualizationScopeStationGroupsComponent {
  @Input() selection:StationAwareVisSelection;
  @Input() networkWrappers: NetworkWrapper[];

  /**
   * Toggle whether a station should be excluded for a selected group
   */
  stationChange(){
    this.selection.groups = this.networkWrappers.reduce((groups,wrapper) => {
        wrapper.stations.then(stations => {
          stations.filter(s => s.selected).forEach(s => groups.push(s.group));
        });
        return groups;
    },[]);
  }
}