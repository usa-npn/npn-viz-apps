import { VisConfigStep, StepState } from "../interfaces";

import { faCalendarAlt } from '@fortawesome/pro-light-svg-icons';
import { Component } from "@angular/core";
import { BaseStepComponent, BaseControlComponent, BaseSubControlComponent } from "./base";

@Component({
    template: ``
})
export class LocationStepComponent extends BaseStepComponent {
    title:string = 'Location';
    
    get state():StepState {
        return this.visited
            ? StepState.COMPLETE // optional so complete if touched.
            : StepState.AVAILABLE;
    }
}

@Component({
    template: `
    <button mat-raised-button (click)="subControlComponent.show()">Show sub-control</button>
    `,
    styles:[`
    
    `]
})
export class LocationControlComponent extends BaseControlComponent {
    title:string = 'Selection location';
}

@Component({
    template: `
   {{title}}
    `,
    styles:[`
    
    `]
})
export class LocationControlSubComponent extends BaseSubControlComponent {
    title:string = "Location sub-control title";
}

export const LocationStep:VisConfigStep = {
    icon: faCalendarAlt,
    stepComponent: LocationStepComponent,
    controlComponent: LocationControlComponent,
    subControlComponent: LocationControlSubComponent
};