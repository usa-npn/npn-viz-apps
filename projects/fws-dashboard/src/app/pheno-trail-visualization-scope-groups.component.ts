import { Input, Component } from '@angular/core';
import { StationAwareVisSelection } from '@npn/common/visualizations/vis-selection';
import { NetworkWrapper } from './pheno-trail-visualization-scope-selection.component';

@Component({
    selector: 'pheno-trail-visualization-scope-groups',
    template: `
    <h3>Select Groups to Compare</h3>
    <pheno-trail-visualization-scope-group *ngFor="let w of networkWrappers" [networkWrapper]="w" (change)="handleChange()" class="group-input"></pheno-trail-visualization-scope-group>
    `,
    styles: [`
      .group-input {
        display:block;
      }
    `]
})
export class PhenoTrailVisualizationScopeGroupsComponent {
  @Input() selection:StationAwareVisSelection;
  @Input() networkWrappers: NetworkWrapper[];

  handleChange(){
    this.selection.groups = this.networkWrappers.filter(w => w.selected).map(w => w.group);
  }
}