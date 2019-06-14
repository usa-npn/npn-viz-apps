import { Component, Input, Inject, HostBinding } from '@angular/core';
import { StepComponent, StepState, VisConfigStep } from './interfaces';
import { faBookAlt, faArrowFromTop } from '@fortawesome/pro-light-svg-icons';
import { VisSelection, MonitorsDestroy } from '@npn/common';
import { Shared } from './sharing.service';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheet, MatBottomSheetRef } from '@angular/material';
import { takeUntil } from 'rxjs/operators';
import { Subject, merge } from 'rxjs';

@Component({
    template: `
    <button class="dismiss" mat-icon-button (click)="ref.dismiss()" matTooltip="Hide description"><fa-icon [icon]="dismissIcon"></fa-icon></button>
    <div class="mat-typography">
        <h2 class="mat-h2">{{data.title}}</h2>
        <h3 class="mat-h2">{{data.tagline}}</h3>
        <div [innerHTML]="data.description"></div>
    </div>
    `,
    styles:[`
    .dismiss {
        float: right;
    }
    `]
})
export class SharedVisualizationDescriptionComponent {
    dismissIcon = faArrowFromTop;
    constructor(
        @Inject(MAT_BOTTOM_SHEET_DATA) public data: Shared,
        public ref:MatBottomSheetRef
    ) {}
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
export class ShareDescriptionComponent extends MonitorsDestroy implements StepComponent {
    title:string = 'visualization description';
    @Input() selection:VisSelection;
    @HostBinding('style.display') display = 'initial';
    step:VisConfigStep = {
        icon: faBookAlt,
        stepComponent: ShareDescriptionComponent,
        controlComponent: null
    }

    constructor(
        private matBottomSheet:MatBottomSheet
    ) {
        super();
    }

    ngOnInit() {
        this.step.$stepInstance = this;
        this.show();
        const serializeSelection = () => JSON.stringify(this.selection.external);
        const initialSelection = serializeSelection();
        const stopSubscription:Subject<void> = new Subject();
        this.selection.pipe(takeUntil(merge(stopSubscription,this.componentDestroyed)))
            .subscribe(e => {
                if(initialSelection !== serializeSelection()) {
                    // the contents of the selection have changed, hide this component
                    // this control hides itself when this happens rather than just deleting the description
                    // because otherwise the parent will re-draw all steps when this component goes away
                    // which will in turn reset things to step 0.
                    // this feels kind of like a workaround but it's unclear WHY Angular is updating stepHosts
                    this.display = 'none';
                    stopSubscription.next();
                }
            });
    }

    ngOnDestroy() {
        if(this.display === 'none') {
            // navigating away, kill the description if the 
            delete this.selection.$shared.description;
        }
    }

    get state():StepState {
        return StepState.ALT;
    }

    show() {
        setTimeout(() => this.matBottomSheet.open(SharedVisualizationDescriptionComponent,{data:this.selection.$shared}));
    }
}