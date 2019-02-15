import { Component, Input, HostBinding } from "@angular/core";
import { VisConfigStep, StepState } from "./interfaces";

// styles part of _explore-pheno-theme.scss
@Component({
    selector: 'step-icon',
    template: `<fa-icon [icon]="step.icon"></fa-icon>`
})
export class StepIconComponent {
    @Input() active:boolean = false;
    @Input() step:VisConfigStep;

    @HostBinding('class') get state() {
        return this.active
            ? StepState.ACTIVE
            : this.step && this.step.$stepInstance
                ? this.step.$stepInstance.selection && this.step.$stepInstance.selection.$shared // see step_controls/vis-selection.ts
                    ? StepState.COMPLETE
                    : this.step.$stepInstance.state
                : null;
    }
}