import { StepComponent, StepState, VisConfigStep } from './interfaces';
import { VisSelection } from '@npn/common';
import { Input, Component, EventEmitter, Output } from '@angular/core';
import { faUser } from '@fortawesome/pro-light-svg-icons';

// see person-control-theme.scss
@Component({
    selector: `person-info`,
    template: `
    <div class="step">
        <div class="step-title alt" [ngClass]="{unavailable: state === 'unavailable'}">
            <step-icon [step]="step"></step-icon>
            <div class="text">{{title}} ({{selection?.personId}})</div>
        </div>
    </div>
    `
})
export class PersonControlComponent implements StepComponent {
    title:string = 'personalized';
    @Input() selection:VisSelection;
    @Output() reset: EventEmitter<any> = new EventEmitter();
    step:VisConfigStep = {
        icon: faUser,
        stepComponent: PersonControlComponent,
        controlComponent: null
    };

    ngOnInit() {
        this.step.$stepInstance = this;
    }

    get state():StepState {
        return StepState.AVAILABLE;
    }
}