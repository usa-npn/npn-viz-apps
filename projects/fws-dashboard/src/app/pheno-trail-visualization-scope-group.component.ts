import { Input, Component, OnInit, Output, EventEmitter } from '@angular/core';
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
        <div *ngFor="let s of networkWrapper.stations | async as all" class="station-input">
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
  chevronDownIcon = faChevronDown;
  chevronRightIcon = faChevronRight;
  loading = false;

  constructor() { }

  ngOnInit(){
    //Load any pre-existing selections
    if(this.networkWrapper.selected){
      this.networkWrapper.getStations();
    }
  }

  /**
   * Toggles the view of the group's stations
   */
  toggleOpen(){
    this.loading = true;
    this.networkWrapper.getStations().then(stations => {
      this.open = !this.open;
      this.loading = false;
    });
    
  }

  /**
   * Toggle whether a station should be excluded for a selected group
   */
  stationChange(){
    this.networkWrapper.getStations().then(stations => {
      this.networkWrapper.selected = true;
      this.networkWrapper.group.excludeIds = stations.filter(station => station.selected).map(station => station.station_id);
      this.change.emit();
    });
  }
}