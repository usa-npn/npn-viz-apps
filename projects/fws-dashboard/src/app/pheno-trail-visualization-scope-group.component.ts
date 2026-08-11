import { Input, Component, OnInit, Output, EventEmitter } from '@angular/core';
import { faChevronRight, faChevronDown } from "@fortawesome/pro-light-svg-icons";
import { ProgramWrapper } from './pheno-trail-visualization-scope-selection.component';

@Component({
    selector: 'pheno-trail-visualization-scope-group',
    template: `
      <button mat-icon-button [attr.aria-label]="'Toggle ' + programWrapper.program.name" (click)="toggleOpen()">
        <mat-icon><fa-icon [icon]="open ? chevronDownIcon : chevronRightIcon"></fa-icon></mat-icon>
      </button>
      <mat-checkbox [(ngModel)]="programWrapper.selected" (change)="change.emit()" [indeterminate]="programWrapper.group.excludeIds?.length > 0">
        {{programWrapper.program.name}}
      </mat-checkbox>
      <div class="station-input" *ngIf="open">
        <h3>Exclude Stations</h3>
        <mat-progress-spinner *ngIf="loading" mode="indeterminate"></mat-progress-spinner>
        <div *ngFor="let s of programWrapper.stations | async as all" class="station-input">
          <mat-checkbox [(ngModel)]="s.selected" (change)="stationChange()" [disabled]="!s.selected && programWrapper.group.excludeIds?.length === (all.length-1)">{{s.station_name}}</mat-checkbox>
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
  @Input() programWrapper:ProgramWrapper;
  @Output() change:EventEmitter<void> = new EventEmitter();
  open = false;
  chevronDownIcon = faChevronDown;
  chevronRightIcon = faChevronRight;
  loading = false;

  constructor() { }

  ngOnInit(){
    //Load any pre-existing selections
    if(this.programWrapper.selected){
      this.programWrapper.getStations();
    }
  }

  /**
   * Toggles the view of the group's stations
   */
  toggleOpen(){
    this.loading = true;
    this.programWrapper.getStations().then(stations => {
      this.open = !this.open;
      this.loading = false;
    });
    
  }

  /**
   * Toggle whether a station should be excluded for a selected group
   */
  stationChange(){
    this.programWrapper.getStations().then(stations => {
      this.programWrapper.selected = true;
      this.programWrapper.group.excludeIds = stations.filter(station => station.selected).map(station => station.station_id);
      this.change.emit();
    });
  }
}