import { Input, Component } from '@angular/core';
import { NetworkService, StationAwareVisSelection, Network } from '@npn/common';
import { PhenologyTrail } from './entity.service';

@Component({
    selector: 'pheno-trail-visualization-scope-selection',
    template: `
    <mat-radio-group name="visScope" class="vis-scope-input" [(ngModel)]="visScope" (change)="scopeChanged()">
      <mat-radio-button class="vis-scope-radio" [value]="'allGroups'">Show data for all groups within "{{phenoTrail.title}}"</mat-radio-button>
      <mat-radio-button class="vis-scope-radio" [value]="'selectGroups'">Show data for select groups within "{{phenoTrail.title}}"</mat-radio-button>
      <!--mat-radio-button class="vis-scope-radio" [value]="'compareGroups'">Compare data between groups within "{{phenoTrail.title}}"</mat-radio-button-->
    </mat-radio-group>
    <mat-progress-spinner *ngIf="groupFetch" mode="indeterminate"></mat-progress-spinner>
    <div *ngIf="(visScope === 'selectGroups' || visScope === 'compareGroups')">
    <hr>
        <h3 class="group-select-header">Select Groups</h3>
        <mat-checkbox *ngFor="let g of groups" class="group-input" [(ngModel)]="g.selected" (change)="groupChange()">{{g.name}}</mat-checkbox>
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
export class PhenoTrailVisualizationScopeSelectionComponent {
  @Input() selection:StationAwareVisSelection;
  @Input() phenoTrail:PhenologyTrail;
  visScope: string = 'allGroups';
  groupFetch: boolean = false;
  groups: Network[];
  private _groups:Promise<Network []>;
  constructor(private networkService: NetworkService) { }

  get valid():boolean {
    return this.visScope === 'allGroups' || !!(this.selection.networkIds && this.selection.networkIds.length);
  }

  scopeChanged(){
    // reset to a clean slate
    this.selection.stationIds = undefined;
    this.selection.groups = undefined;
    this.selection.networkIds = undefined;
    switch (this.visScope) {
      case 'allGroups':
          // it's always set and doesn't ever need to change
          this.selection.networkIds = this.phenoTrail.network_ids.slice();
          break;
      case 'selectGroups':
        this.selection.networkIds = this.phenoTrail.network_ids.slice();
        if (!this._groups) {
            this.groupFetch = true;
            this._groups = this.networkService.getNetworks(this.phenoTrail.network_ids)
                .then(groups => {
                    this.groupFetch = false;
                    return groups;
                });
        }
        this._groups.then((groups:Network[]) => {
            // all selected for selectGroups mode and all de-selected for compareGroups mode
            groups.forEach(g => g.selected = this.visScope === 'selectGroups');
            this.groups = groups;
        });
        break;
      case 'compareGroups':
          break;
    }
  }

  groupChange(){
    switch(this.visScope) {
      case 'selectGroups':
          this.selection.networkIds = this.groups.filter(g => g.selected).map(g => g.network_id);
          break;
    }
  }
}