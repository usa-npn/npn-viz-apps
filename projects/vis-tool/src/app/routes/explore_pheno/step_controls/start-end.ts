import { VisConfigStep, StepState } from "../interfaces";

import { faCalendarAlt } from '@fortawesome/pro-light-svg-icons';
import { Component, ViewEncapsulation } from "@angular/core";
import { BaseStepComponent, BaseControlComponent } from "./base";

@Component({
    template: `{{selection?.start}}<span *ngIf="selection && selection.end"> - </span>{{selection?.end}}`
})
export class StartEndStepComponent extends BaseStepComponent {
    protected defaultPropertyKeys:string[] = ['start','end'];

    get state():StepState {
        return this.selection.start && this.selection.end
            ? StepState.COMPLETE
            : StepState.AVAILABLE;
    }
}

@Component({
    template: `<year-range-input [(start)]="selection.start" [(end)]="selection.end" (onStartChange)="selection.update()" (onEndChange)="selection.update()"></year-range-input>`,
    styles:[`
    year-range-input {
        display: flex;
        flex-direction: column;
        align-items: stretch;
    }
    year-range-input>* {
        width: inherit !important;
    }
    `],
    encapsulation: ViewEncapsulation.None
})
export class StartEndControlComponent extends BaseControlComponent {
}

export const StartEndStep:VisConfigStep = {
    title: 'Date range',
    controlTitle: 'Select date range',
    icon: faCalendarAlt,
    stepComponent: StartEndStepComponent,
    controlComponent: StartEndControlComponent
};