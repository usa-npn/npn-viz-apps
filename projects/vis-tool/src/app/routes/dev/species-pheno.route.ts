import { Component, ViewEncapsulation } from '@angular/core';
import { VisualizationSelectionFactory, StationAwareVisSelection } from '@npn/common';

@Component({
    template: `
    <higher-species-phenophase-input [selection]="selection" [(plot)]="plot"
        [gatherColor]="gatherColor" [required]="required" [disabled]="disabled"
        [debug]="debug"></higher-species-phenophase-input>
    <ul class="options">
        <li><mat-checkbox [(ngModel)]="useBoundary">Use Maine boundary</mat-checkbox></li>
        <li><mat-checkbox [(ngModel)]="gatherColor">Gather color</mat-checkbox></li>
        <li><mat-checkbox [(ngModel)]="required">Required</mat-checkbox></li>
        <li><mat-checkbox [(ngModel)]="disabled">Disabled</mat-checkbox></li>
        <li><mat-checkbox [(ngModel)]="debug">Debug info</mat-checkbox></li>
    </ul>
    <pre>plot={{plot | json}}</pre>
    `,
    encapsulation: ViewEncapsulation.None,
    styles:[`
    higher-species-phenophase-input {
        display: flex;
        flex-direction: column;
        width: 300px;
    }
    ul.options {
        padding-left: 0px;
    }
    ul.options > li {
        list-style: none;
    }
    `]
})
export class SpeciesPhenoRoute {
    selection:StationAwareVisSelection;
    plot = {
        speciesRank: 'family',
        species: {
            family_id: 329,
            family_name: "Sapindaceae",
            family_common_name: "Soapberry Family",
            kingdom: "Plantae"
        },
        phenophaseRank: 'phenophase',
        phenophase: {
            phenophase_id: 371,
            phenophase_name: "Breaking leaf buds",
            phenophase_category: "Leaves",
            phenophase_definition: "One or more breaking leaf buds are visible on the plant.  A leaf bud is considered 'breaking' once a green leaf tip is visible at the end of the bud, but before the first leaf from the bud has unfolded to expose the leaf stalk (petiole) or leaf base.",
            seq_num: 10,
            color: "Green1",
            pheno_class_id: 1,
            pheno_class_name: "Initial shoot or leaf growth"
        }
    };
    maine = {
        id: 39,
        boundaryName: "Maine",
        typeId: 1,
        boundaryTypeName: "US States"
    };
    debug:boolean = true;
    gatherColor:boolean = false;
    required:boolean = true;
    disabled:boolean = false;
    private _useBoundary:boolean = false;

    constructor(
        private selectionFactory:VisualizationSelectionFactory
    ) {}

    get useBoundary():boolean { return this._useBoundary; }
    set useBoundary(b:boolean) {
        if(this._useBoundary = b) {
            this.selection.boundaries = [this.maine];
        } else {
            this.selection.boundaries = [];
        }
    }

    ngOnInit() {
        // a StationAware selection
        this.selection = this.selectionFactory.newScatterPlotSelection();
    }
}
