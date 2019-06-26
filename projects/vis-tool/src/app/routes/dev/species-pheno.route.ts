import { Component } from '@angular/core';
import { VisualizationSelectionFactory, VisSelection, StationAwareVisSelection } from '@npn/common';

@Component({
    template: `
    <higher-species-phenophase-input [selection]="selection" [(plot)]="plot" [debug]="debug"></higher-species-phenophase-input>
    <mat-checkbox [(ngModel)]="useBoundary">Use Maine boundary</mat-checkbox>
    <mat-checkbox [(ngModel)]="debug">Debug info</mat-checkbox>
    <pre>plot={{plot | json}}</pre>
    `
})
export class SpeciesPhenoRoute {
    selection:StationAwareVisSelection;
    plot = {
        speciesRank: 'class',
        species: {
            class_id: 5,
            class_name: 'Aves',
            class_common_name: 'Birds'
        }
    };
    maine = {
        id: 39,
        boundaryName: "Maine",
        typeId: 1,
        boundaryTypeName: "US States"
    };
    debug:boolean = true;
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
