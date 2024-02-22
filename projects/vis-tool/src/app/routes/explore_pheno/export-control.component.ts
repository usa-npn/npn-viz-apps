import { Component, Input } from '@angular/core';

import { faDownload } from '@fortawesome/pro-light-svg-icons';

import { NpnServiceUtils } from "@npn/common";
import { StepComponent, StepState, VisConfigStep } from "./interfaces";
import { VisSelection } from '@npn/common';
import { SupportsPOPInput, completePOPDates } from '@npn/common/visualizations/vis-selection';
import { environment } from 'projects/vis-tool/src/environments/environment';

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

    constructor(private serviceUtils:NpnServiceUtils) {}

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
            // save the POP input and get back a hash
            .then(searchJson => this.serviceUtils.http.post<any>(
                    this.serviceUtils.popApipUrl('/search'),
                    {searchJson}
                ).toPromise()
                // just tease out the hash
                .then(results => results.saved_search_hash)
            )
            // argh, so many URLs
            .then(hash => window.open(`https://data${environment.production ? '' :'-dev'}.usanpn.org/observations?search=${hash}`));
    }
}
