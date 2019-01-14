import { VisConfigStep, StepComponent, ControlComponent, StepState } from "../interfaces";

import { emptyIcon } from '../../../custom_icons';
import { Component } from "@angular/core";

@Component({
    template: ''
})
export class DummyStepComponent implements StepComponent {
    state = StepState.UNAVAILABLE;
}

@Component({
    template: ''
})
export class DummyControlComponent implements ControlComponent {
}

export const DummyStep:VisConfigStep = {
    title: '',
    controlTitle: '',
    icon: emptyIcon,
    stepComponent: DummyStepComponent,
    controlComponent: DummyControlComponent
};