import { Component, Input, Inject, HostBinding, ViewChild, ElementRef } from '@angular/core';
import { StepComponent, StepState, VisConfigStep } from './interfaces';
import { faBookAlt, faArrowFromTop } from '@fortawesome/pro-light-svg-icons';
import { VisSelection, MonitorsDestroy } from '@npn/common';
import { Shared, SharingService } from './sharing.service';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheet, MatBottomSheetRef, MatRipple } from '@angular/material';
import { takeUntil, delay, tap} from 'rxjs/operators';
import { Subject, merge, timer } from 'rxjs';

@Component({
    template: `
    <button class="dismiss" mat-icon-button (click)="closeDescription()" matTooltip="Hide description"><fa-icon [icon]="dismissIcon"></fa-icon></button>
    <div class="mat-typography">
        <h2 class="mat-h2">{{data.title}}</h2>
        <!-- <h3 class="mat-h2">{{data.tagline}}</h3> -->
        <div>
        <div *ngIf="data.image" style="float: left; padding: 10px">
            <img src="{{data.image.src}}" alt="{{data.image.alt}}" width="auto" height="300px">
            <p *ngIf="data.image.credit"><i>Image credit: {{data.image.credit}}</i></p>
        </div>
        <div [innerHTML]="data.description"></div>
        </div>
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
        public ref:MatBottomSheetRef,
        private sharingService:SharingService
    ) {}

    closeDescription() {
        this.sharingService.closingShareDescription.next(true);
        this.ref.dismiss();
    }
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
                <button *ngIf="showRipple" matRipple [matRippleColor]="'rgba(0, 153, 0, 0.5)'" mat-stroked-button color="accent" (click)="show()">Show description</button>
                <button *ngIf="!showRipple" mat-stroked-button color="accent" (click)="show()">Show description</button>
            </div>
        </div>
    </div>
    `
})
export class ShareDescriptionComponent extends MonitorsDestroy implements StepComponent {
    title:string = 'visualization description';
    showRipple = false;
    @Input() selection:VisSelection;
    @HostBinding('style.display') display = 'initial';
    step:VisConfigStep = {
        icon: faBookAlt,
        stepComponent: ShareDescriptionComponent,
        controlComponent: null
    }

    @ViewChild(MatRipple) ripple: MatRipple;

    triggerRipple() { //& ::ng-deep .mat-slide-toggle-ripple.mat-ripple { display: none; }
        if(this.ripple)
            this.ripple.launch({centered: true});
    }

    constructor(
        private matBottomSheet:MatBottomSheet,
        private sharingService:SharingService
    ) {
        super();
    }

    serializeSelection(selection) {
        let s = selection;
        // ignore timezone on dates
        let dateRegEx = /^\d{4}-\d{2}-\d{2}/;
        if(s. extentValue && s.extentValue.match(dateRegEx)) {
            s.extentValue = s.extentValue.substring(0,10);
        }

        if(s.plots) {
            s.plots.forEach(plot => {
                // remove undefined keys
                Object.keys(plot).forEach(key => {
                    if (plot[key] === undefined || plot[key] === null) {
                        delete plot[key];
                    } 
                });
            });
            
            // get rid of empty objects in plots array
            s.plots = s.plots.filter(plot => JSON.stringify(plot) !== '{}');
            s.plots = s.plots.filter(plot => JSON.stringify(plot) !== '{"phenophaseRank":"class"}');
        }

        return JSON.stringify(s);
    }

    ngOnInit() {
        this.sharingService.closingShareDescription
            .pipe(tap(ev => this.showRipple = true), delay(1000))
            .subscribe(() => { 
                this.triggerRipple();
                setTimeout(()=> {
                    this.triggerRipple();
                }, 1000)
                setTimeout(()=> {
                    this.showRipple = false;
                }, 1500)
            });
        this.step.$stepInstance = this;
        this.show();
        const initialSelection = this.serializeSelection(this.selection.external);
        const stopSubscription:Subject<void> = new Subject();
        this.selection.pipe(takeUntil(merge(stopSubscription,this.componentDestroyed)))
            .subscribe(e => {
               
                let currentSelection = this.serializeSelection(this.selection.external);

                if(initialSelection !== currentSelection) {
                    // the contents of the selection have changed, hide this component
                    // this control hides itself when this happens rather than just deleting the description
                    // because otherwise the parent will re-draw all steps when this component goes away
                    // which will in turn reset things to step 0.
                    // this feels kind of like a workaround but it's unclear WHY Angular is updating stepHosts

                    // NOTE: this can happen if a "shared selection" contains old stuff that
                    // a control like species/pheno might update, or if some server species/pheno
                    // data changed so the shared selection's representation is out of date with
                    // what the UI might generate today...  If the control goes away for
                    // canned stories this is almost certainly why.
                    this.display = 'none'; //temp comment out by jeff
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