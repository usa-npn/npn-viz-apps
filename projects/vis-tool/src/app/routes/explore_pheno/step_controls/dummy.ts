import { VisConfigStep, StepComponent, ControlComponent, StepState } from "../interfaces";

import { emptyIcon } from '../../../custom_icons';
import { Component } from "@angular/core";

@Component({
    template: ''
})
export class DummyStepComponent implements StepComponent {
    title:string = '';
    state = StepState.UNAVAILABLE;
}

@Component({
    template: ''
})
export class DummyControlComponent implements ControlComponent {
    title:string = '';
}

export const DummyStep:VisConfigStep = {
    icon: emptyIcon,
    stepComponent: DummyStepComponent,
    controlComponent: DummyControlComponent
};