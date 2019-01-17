import { VisConfigStep, StepState } from "../interfaces";

import { faBars } from '@fortawesome/pro-light-svg-icons';
import { Component } from "@angular/core";
import { CalendarSelection, AXIS } from "@npn/common";
import { BaseStepComponent, BaseControlComponent } from "./base";

@Component({
    template: `
    <div class="misc"  *ngIf="visited">
        <div><label>Display negative data</label> {{selection.negative ? 'Yes' : 'No'}}</div>
    </div>
    `,
    styles: [`
    .misc {
        display: flex;
        flex-direction: column;
    }
    .misc >div {
        padding-bottom: 5px;
    }
    label {
        font-weight: 600;
    }
    label:after {
        content: ':';
    }
    `]
})
export class CalendarMiscStepComponent extends BaseStepComponent {
    title:string = 'Behavior';
    selection: CalendarSelection;

    get state():StepState {
        return this.selection.validPlots.length
            ? this.visited
                ? StepState.COMPLETE
                : StepState.AVAILABLE
            : StepState.UNAVAILABLE;
    }
}

@Component({
    template: `
    <mat-checkbox [(ngModel)]="selection.negative" (change)="selection.redraw()">Display negative data</mat-checkbox>

    <label for="label-size-input">Label size
        <mat-slider id="label-size-input" min="0" max="10" step="0.25" [(ngModel)]="selection.fontSizeDelta" (change)="selection.redraw()" [disabled]="!selection.isValid()"></mat-slider>
    </label>

    <label for="label-position-input">Label position
        <mat-slider id="label-position-input" min="0" max="100" step="1" [(ngModel)]="selection.labelOffset" (change)="selection.redraw()" [disabled]="!selection.isValid()"></mat-slider>
    </label>

    <label for="label-band-size-input">Band size
        <mat-slider invert id="label-band-size-input" min="0" max="0.95" step="0.05" [(ngModel)]="selection.bandPadding" (change)="selection.redraw()" [disabled]="!selection.isValid()"></mat-slider>
    </label>
    `,
    styles:[`
    :host {
        display: flex;
        flex-direction: column;
    }
    :host >* {
        margin-bottom: 5px;
    }
    `]
})
export class CalendarMiscControlComponent extends BaseControlComponent {
    title:string = 'Select visualization behavior'
    protected defaultPropertyKeys:string[] = ['negative','fontSizeDelta','labelOffset','bandPadding'];
    selection: CalendarSelection;
    axis = AXIS;

    stepVisit():void {
        const firstVisit = !this.visited;
        super.stepVisit();
        // this feels a little less than ideal...
        if(firstVisit) {
            this.selection.redraw();
        }
    }
}

export const CalendarMiscStep:VisConfigStep = {
    icon: faBars,
    stepComponent: CalendarMiscStepComponent,
    controlComponent: CalendarMiscControlComponent
};