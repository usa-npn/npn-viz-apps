import { Input, Component } from '@angular/core';
import { StationAwareVisSelection } from '@npn/common/visualizations/vis-selection';
import { ProgramWrapper } from './pheno-trail-visualization-scope-selection.component';

@Component({
    selector: 'pheno-trail-visualization-scope-groups',
    template: `
    <h3>Select Groups to Compare</h3>
    <pheno-trail-visualization-scope-group *ngFor="let w of programWrappers" [programWrapper]="w" (change)="handleChange()" class="group-input"></pheno-trail-visualization-scope-group>
    `,
    styles: [`
      .group-input {
        display:block;
      }
    `]
})
export class PhenoTrailVisualizationScopeGroupsComponent {
  @Input() selection:StationAwareVisSelection;
  @Input() programWrappers: ProgramWrapper[];

  handleChange(){
    this.selection.groups = this.programWrappers.filter(w => w.selected).map(w => w.group);
  }
}