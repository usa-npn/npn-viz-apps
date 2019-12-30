import { Input, Component, OnInit, Output, EventEmitter } from '@angular/core';
import { NetworkService, Station } from '@npn/common';
import { faChevronRight, faChevronDown } from "@fortawesome/pro-light-svg-icons";
import { NetworkWrapper } from './pheno-trail-visualization-scope-selection.component';

@Component({
    selector: 'pheno-trail-visualization-scope-group',
    template: `
      <button mat-icon-button [attr.aria-label]="'Toggle ' + networkWrapper.network.name" (click)="toggleOpen()">
        <mat-icon><fa-icon [icon]="open ? chevronDownIcon : chevronRightIcon"></fa-icon></mat-icon>
      </button>
      <mat-checkbox [(ngModel)]="networkWrapper.selected" (change)="change.emit()" [indeterminate]="networkWrapper.group.excludeIds?.length > 0">
        {{networkWrapper.network.name}}
      </mat-checkbox>
      <div class="station-input" *ngIf="open">
        <h3>Exclude Stations</h3>
        <mat-progress-spinner *ngIf="loading" mode="indeterminate"></mat-progress-spinner>
        <div *ngFor="let s of stations | async as all" class="station-input">
          <mat-checkbox [(ngModel)]="s.selected" (change)="stationChange()" [disabled]="!s.selected && networkWrapper.group.excludeIds?.length === (all.length-1)">{{s.station_name}}</mat-checkbox>
        </div>
      </div>
    `,
    styles: [`
      .station-input {
        display: block;
        padding-left: 34px;
      }
    `]
})
export class PhenoTrailVisualizationScopeGroupComponent implements OnInit{
  @Input() networkWrapper:NetworkWrapper;
  @Output() change:EventEmitter<void> = new EventEmitter();
  open = false;
  stations: Promise<Station[]>;
  chevronDownIcon = faChevronDown;
  chevronRightIcon = faChevronRight;
  loading = false;
  
  constructor(private networkService:NetworkService) { }

  ngOnInit(){
    //Load any pre-existing selections
    if(this.networkWrapper.selected){
      this.loadStations();
    }
  }

  loadStations(){
    if(!this.stations){
      this.loading = true;
      this.stations = this.networkService.getStations(this.networkWrapper.network.network_id).then(stations => {
        stations.forEach(station =>  station.selected = (this.networkWrapper.group.excludeIds || []).indexOf(station.station_id) > -1);
        this.loading = false;
        return stations;
      });
    }
    return this.stations;
  }

  /**
   * Toggles the view of the group's stations
   */
  toggleOpen(){
    this.loadStations();
    this.open = !this.open;
  }

  /**
   * Toggle whether a station should be excluded for a selected group
   */
  stationChange(){
    this.loadStations().then(stations => {
      this.networkWrapper.selected = true;
      this.networkWrapper.group.excludeIds = stations.filter(station => station.selected).map(station => station.station_id);
      this.change.emit();
    });
  }
}