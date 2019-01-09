import { Component, Input } from "@angular/core";
import { VisConfigStep } from "./interfaces";

// styles part of _explore-pheno-theme.scss
@Component({
    selector: 'step-icon',
    template: `<fa-icon [icon]="step.icon"></fa-icon>`
})
export class StepIconComponent {
    @Input() step:VisConfigStep;
}