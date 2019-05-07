import { Component, Input } from '@angular/core';

import { fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
    faShareAlt
  } from '@fortawesome/pro-light-svg-icons';

import { MonitorsDestroy } from "@npn/common";
import { StepComponent, StepState, VisConfigStep } from "./interfaces";
import { Router } from '@angular/router';
import { RoutePath } from '../../route-path';
import { VisSelection } from '@npn/common';
import { SharingService } from './sharing.service';
import { MatSnackBar } from '@angular/material';
import { Location } from '@angular/common';

@Component({
    selector: `share-visualization`,
    template: `
    <div class="step">
        <div class="step-title alt" [ngClass]="{unavailable: state === 'unavailable'}">
            <step-icon [step]="step"></step-icon>
            <div class="text">{{title}}</div>
        </div>
        <div class="step-host">
            <div *ngIf="selection?.isValid()">
                <button mat-stroked-button color="accent" (click)="shareToClipboard()">Copy link to clipboard</button>
            </div>
        </div>
    </div>
    `
})
export class ShareControlComponent extends MonitorsDestroy implements StepComponent {
    title:string = 'share visualization';
    @Input() selection:VisSelection;
    step:VisConfigStep = {
        icon: faShareAlt,
        stepComponent: ShareControlComponent,
        controlComponent: null
    };

    constructor(
        private router:Router,
        private location:Location,
        private sharingService:SharingService,
        private snackBar:MatSnackBar
    ) {
        super();
    }

    get state():StepState {
        return this.selection && this.selection.isValid()
            ? StepState.ALT
            : StepState.UNAVAILABLE;
    }

    ngOnInit() {
        this.step.$stepInstance = this;
        fromEvent(window,'keypress')
            .pipe(takeUntil(this.componentDestroyed))
            .subscribe((ke:KeyboardEvent) => {
                if(ke.ctrlKey && ke.shiftKey && ke.key === 'S') {
                    this.copyToClipboard(JSON.stringify(this.selection.external,null,2));
                    this.snackBar.open('Selection copied to the clipboard.');
                }
            });
    }

    shareToClipboard() {
        const urlTree = this.router.createUrlTree([RoutePath.EXPLORE_PHENO,{s:this.sharingService.serialize(this.selection,true)}]);
        const url = this.location.prepareExternalUrl(this.router.serializeUrl(urlTree));
        this.copyToClipboard(`${window.location.origin}${window.location.pathname}${url}`);
        this.snackBar.open('Link copied to the clipboard.');
    }

    private copyToClipboard(val: string){
        const selBox = document.createElement('textarea');
        selBox.style.position = 'fixed';
        selBox.style.left = '0';
        selBox.style.top = '0';
        selBox.style.opacity = '0';
        selBox.value = val;
        document.body.appendChild(selBox);
        selBox.focus();
        selBox.select();
        document.execCommand('copy');
        document.body.removeChild(selBox);
      }
}
