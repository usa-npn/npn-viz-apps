import { Input, Component } from '@angular/core';
import { StationAwareVisSelection } from '@npn/common';
import { PhenologyTrail } from './entity.service';

@Component({
    selector: 'pheno-trail-visualization-scope-selection',
    template: `
    TODO
    `
})
export class PhenoTrailVisualizationScopeSelectionComponent {
  @Input() selection:StationAwareVisSelection;
  @Input() phenoTrail:PhenologyTrail;

  get valid():boolean {
      return true;
  }
}