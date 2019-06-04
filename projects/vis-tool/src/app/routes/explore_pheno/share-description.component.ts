import { Component, Input, Inject } from '@angular/core';
import { StepComponent, StepState, VisConfigStep } from './interfaces';
import { faBookAlt } from '@fortawesome/pro-light-svg-icons';
import { VisSelection } from '@npn/common';
import { Shared } from './sharing.service';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheet } from '@angular/material';

@Component({
    template: `
    <div class="mat-typography">
        <h2 class="mat-h2">{{data.title}}</h2>
        <h3 class="mat-h2">{{data.tagline}}</h3>
        <div [innerHTML]="data.description"></div>
    </div>
    `
})
export class SharedVisualizationDescriptionComponent {
    constructor(
        @Inject(MAT_BOTTOM_SHEET_DATA)
        public data: Shared) { }
}

@Component({
    selector: 'share-description',
    template: `
    <div class="step">
        <div class="step-title alt" [ngClass]="{unavailable: state === 'unavailable'}">
            <step-icon [step]="step"></step-icon>
            <div class="text">{{title}}</div>
        </div>
        <div class="step-host">
            <div *ngIf="selection?.isValid() && selection.$shared?.description">
                <button mat-stroked-button color="accent" (click)="show()">Show description</button>
            </div>
        </div>
    </div>
    `
})
export class ShareDescriptionComponent implements StepComponent {
    title:string = 'visualization description';
    @Input() selection:VisSelection;
    step:VisConfigStep = {
        icon: faBookAlt,
        stepComponent: ShareDescriptionComponent,
        controlComponent: null
    }

    constructor(
        private matBottomSheet:MatBottomSheet
    ) {}

    ngOnInit() {
        this.step.$stepInstance = this;
        this.show();
    }

    get state():StepState {
        return StepState.ALT;
    }

    show() {
        this.matBottomSheet.open(SharedVisualizationDescriptionComponent,{data:this.selection.$shared});
    }
}