import { StepComponent, StepState, VisConfigStep } from './interfaces';
import { VisSelection } from '@npn/common';
import { Input, Component, EventEmitter, Output } from '@angular/core';
import { faUser, faInfoCircle } from '@fortawesome/pro-light-svg-icons';

// see person-control-theme.scss
@Component({
    selector: `person-info`,
    template: `
    <div class="step">
        <div class="step-title alt" [ngClass]="{unavailable: state === 'unavailable'}">
            <step-icon [step]="step"></step-icon>
            <div class="text">{{title}} {{id}} <fa-icon [icon]="helpIcon" [matTooltip]="tooltip"></fa-icon></div>
        </div>
    </div>
    `
})
export class PersonControlComponent implements StepComponent {
    @Input() selection:VisSelection;
    @Output() reset: EventEmitter<any> = new EventEmitter();
    step:VisConfigStep = {
        icon: faUser,
        stepComponent: PersonControlComponent,
        controlComponent: null
    };

    helpIcon = faInfoCircle;

    get id():any {
        return this.selection && this.selection.personId
            ? this.selection.personId
            : this.selection && this.selection.groupId
                ? this.selection.groupId
                : '?';
    }

    get title():string {
        return this.selection && this.selection.personId
            ? 'Person'
            : this.selection && this.selection.groupId
                ? 'Group'
                : '?';
    }

    get tooltip():string {
        return `This visualization is contrained to data collected by ${this.title} ${this.id}`;
    }

    ngOnInit() {
        this.step.$stepInstance = this;
    }

    get state():StepState {
        return StepState.AVAILABLE;
    }
}