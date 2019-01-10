import { StepComponent, ControlComponent, VisConfigStep } from "../interfaces";

import { faCalendarAlt } from '@fortawesome/pro-light-svg-icons';
import { Component } from "@angular/core";

@Component({
    template: `{{selection?.start}}<span *ngIf="selection && selection.end"> - </span>{{selection?.end}}`
})
export class StartEndStepComponent implements StepComponent {
}

@Component({
    template: `<year-range-input [(start)]="selection.start" [(end)]="selection.end" (onStartChange)="selection.update()" (onEndChange)="selection.update()"></year-range-input>`
})
export class StartEndControlComponent implements ControlComponent {
}

export const StartEndStep:VisConfigStep = {
    title: 'Date range',
    controlTitle: 'Select date range',
    icon: faCalendarAlt,
    stepComponent: StartEndStepComponent,
    controlComponent: StartEndControlComponent
};