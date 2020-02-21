import { Input, Component, OnInit } from '@angular/core';
import { NetworkService, StationAwareVisSelection, Network, Station } from '@npn/common';
import { PhenologyTrail } from './entity.service';
import { SelectionGroup, SelectionGroupMode } from '@npn/common/visualizations/vis-selection';

export class NetworkWrapper {
  group:SelectionGroup;
  selected:boolean;
  stations: Promise<Station[]>;

  constructor(
    private selection:StationAwareVisSelection,
    public network:Network,
    private networkService:NetworkService
  ) {
    if(this.selection.groups) { // existing selection
      const g0 = this.selection.groups[0];
      if(g0.mode === SelectionGroupMode.NETWORK){
        this.group = this.selection.groups.find(g => g.id === network.network_id);
        this.selected = !!this.group
      }
      else if (g0.mode === SelectionGroupMode.STATION){
        this.getStationsWithGroup();
      }
    } 
    else {
      this.selected = this.selection.networkIds.indexOf(network.network_id) > -1;
    }
    if(!this.group) {
        // create new group
        this.group = {
        label: network.name,
        mode: SelectionGroupMode.NETWORK,
        id: network.network_id,
        excludeIds: []
      }
    }
    // set label unconditionally in case it changed
    this.group.label = network.name;
  }

  getStations():Promise<Station[]>{
    if(!this.stations){
      this.stations = this.networkService.getStations(this.network.network_id).then(stations => {
        stations.forEach(station =>  station.selected = (this.group.excludeIds || []).indexOf(station.station_id) > -1);
        return stations;
      });
    }
    return this.stations;
  }

  // component uses this Promise to render station list
  getStationsWithGroup():Promise<Station[]> {
    this.stations = this.getStations().then(stations => {
        stations.forEach(s => {
            s.selected = !!this.selection.groups ? !!this.selection.groups.find(g => g.id === s.station_id) : false;
            s.group = {
              label: `${this.network.name} - ${s.station_name}`,
              mode: SelectionGroupMode.STATION,
              id: s.station_id
            };
        });
        return stations;            
    });
    return this.stations;
  }
}


@Component({
    selector: 'pheno-trail-visualization-scope-selection',
    template: `
    <mat-radio-group name="visScope" class="vis-scope-input" [(ngModel)]="visScope" (change)="scopeChanged()">
      <mat-radio-button class="vis-scope-radio" [value]="'allGroups'">Show data for all groups within "{{phenoTrail.title}}"</mat-radio-button>
      <mat-radio-button class="vis-scope-radio" [value]="'selectGroups'">Show data for select groups within "{{phenoTrail.title}}"</mat-radio-button>
      <mat-radio-button class="vis-scope-radio" [value]="'compareGroups'">Compare data between groups within "{{phenoTrail.title}}"</mat-radio-button>
      <mat-radio-button class="vis-scope-radio" [value]="'compareSites'">Compare data between sites within "{{phenoTrail.title}}"</mat-radio-button>
      </mat-radio-group>
    <mat-progress-spinner *ngIf="networkFetch" mode="indeterminate"></mat-progress-spinner>
    <div *ngIf="visScope === 'selectGroups'">
      <hr>
      <h3 class="group-select-header">Select Groups</h3>
      <mat-checkbox *ngFor="let n of networks | async" class="group-input" [(ngModel)]="n.selected" (change)="selectGroupChange()" [disabled]="n.selected && selection.networkIds.length === 1">{{n.network.name}}</mat-checkbox>
    </div>
    <div *ngIf="visScope === 'compareGroups' && networks | async as networkWrappers">
      <hr>
      <pheno-trail-visualization-scope-groups [selection]="selection" [networkWrappers]="networkWrappers"></pheno-trail-visualization-scope-groups>
    </div>
    <div *ngIf="visScope === 'compareSites' && networks | async as networkWrappers">
      <hr>
      <pheno-trail-visualization-scope-station-groups [selection]="selection" [networkWrappers]="networkWrappers"></pheno-trail-visualization-scope-station-groups>
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
        .group-input {
          display: block;
          padding-left: 34px;
        }
        .group-select-header{
          margin-bottom:20px;
        }
        
    `]
})
export class PhenoTrailVisualizationScopeSelectionComponent implements OnInit{
  @Input() selection:StationAwareVisSelection;
  @Input() phenoTrail:PhenologyTrail;
  visScope: string = 'allGroups';
  networkFetch: boolean = false;
  stations: Station[];
  networks:Promise<NetworkWrapper[]>;
  constructor(private networkService: NetworkService) { }

  ngOnInit(){
    this.networkFetch = true;
    this.networks = this.networkService.getNetworks(this.phenoTrail.network_ids)
    .then((networks:Network[]) => {
      const wrappers = networks.map(n => new NetworkWrapper(this.selection,n,this.networkService));
      this.networkFetch = false;
      return wrappers;
    });

    const {selection} = this;
    if(selection.groups && selection.groups.length){
      const g0 = this.selection.groups[0];
      if(g0.mode === SelectionGroupMode.NETWORK){
        this.visScope = "compareGroups";
      }
      else if (g0.mode === SelectionGroupMode.STATION){
        this.visScope = "compareSites";
      }
    } else if(selection.networkIds && selection.networkIds.length && selection.networkIds.length != this.phenoTrail.network_ids.length){
      this.visScope = "selectGroups";
    }else{
      this.visScope = "allGroups";
    }
  }

  get valid():boolean {
    return this.visScope === 'allGroups' || !!(this.selection.networkIds && this.selection.networkIds.length) 
            || !!(this.selection.groups && this.selection.groups.length);
  }

  scopeChanged(){
    // reset to a clean slate
    this.selection.stationIds = undefined;
    this.selection.groups = undefined;
    this.selection.networkIds = this.phenoTrail.network_ids.slice();
    switch (this.visScope) {
      case 'allGroups':
        // it's always set and doesn't ever need to change
        break;
      case 'compareGroups':
      case 'selectGroups':
        this.networks.then(networks => {
          networks.forEach(n => n.selected = this.visScope === 'selectGroups');
        });
        break;
      case 'compareSites':
          this.networks.then(networks => {
            networks.forEach(n => {
              n.selected = this.visScope === 'selectGroups';
              n.getStationsWithGroup();
            });
          });
          break;
    }
  }

  selectGroupChange(){
    this.networks.then(networks => {
      this.selection.networkIds = networks.filter(n => n.selected).map(n => n.network.network_id);
    });
  }
}