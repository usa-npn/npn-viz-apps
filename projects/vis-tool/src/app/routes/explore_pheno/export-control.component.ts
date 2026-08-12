import { Component, Input } from '@angular/core';

import { faDownload } from '@fortawesome/pro-light-svg-icons';

import { MatSnackBar } from '@angular/material';

import { SavedSearchService } from "@npn/common";
import { StepComponent, StepState, VisConfigStep } from "./interfaces";
import { VisSelection } from '@npn/common';
import { SupportsPOPInput, completePOPDates } from '@npn/common/visualizations/vis-selection';

@Component({
    selector: `export-visualization`,
    template: `
    <div class="step">
        <div class="step-title alt" [ngClass]="{unavailable: state === 'unavailable'}">
            <step-icon [step]="step"></step-icon>
            <div class="text">{{title}}</div>
        </div>
        <div class="step-host">
            <div *ngIf="selection?.isValid()">
                <button mat-stroked-button color="accent" (click)="export()">Export data</button>
            </div>
        </div>
    </div>
    `
})
export class ExportControlComponent implements StepComponent {
    title:string = 'export visualization data';
    @Input() selection:VisSelection;
    step:VisConfigStep = {
        icon: faDownload,
        stepComponent: ExportControlComponent,
        controlComponent: null
    };

    constructor(
        private savedSearchService:SavedSearchService,
        private snackBar:MatSnackBar
    ) {}

    get state():StepState {
        return this.selection && this.selection.isValid()
            ? StepState.ALT
            : StepState.UNAVAILABLE;
    }

    ngOnInit() {
        this.step.$stepInstance = this;
    }

    export() {
        (this.selection as any as SupportsPOPInput).toPOPInput()
            .then(input => completePOPDates(input))
            // SavedSearchService owns both URLs involved -- saving the search and the
            // portal address its hash opens at.
            .then(searchJson => this.savedSearchService.exportUrl(searchJson))
            .then(url => window.open(url))
            .catch(err => {
                // Previously this chain had no catch at all, so a failed save left the
                // button looking like it had simply done nothing.
                console.error(err);
                this.snackBar.open('Unable to export this visualization\'s data.');
            });
    }
}
