import { StepComponent, ControlComponent, VisConfigStep } from "../interfaces";

import { faQuestion } from '@fortawesome/pro-light-svg-icons';
import { emptyIcon } from '../../../custom_icons';
import { Component } from "@angular/core";

@Component({
    template: ''
})
export class DummyComponent implements StepComponent,ControlComponent {
}

export const DummyStep:VisConfigStep = {
    title: '',
    controlTitle: '',
    icon: emptyIcon,
    stepComponent: DummyComponent,
    controlComponent: DummyComponent
};