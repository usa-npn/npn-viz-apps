import { StepComponent, StepState, VisConfigStep } from './interfaces';
import { VisSelection, VisualizationSelectionFactory } from '@npn/common';
import { Input, Component, EventEmitter, Output } from '@angular/core';
import { faUser, faInfoCircle, faTimesCircle } from '@fortawesome/pro-light-svg-icons';
import { clearPersonalized } from './step_controls/vis-selection';

// see person-control-theme.scss
@Component({
    selector: `person-info`,
    template: `
    <div class="step">
        <div class="step-title alt" [ngClass]="{unavailable: state === 'unavailable'}">
            <step-icon [step]="step"></step-icon>
            <div class="text person-text">{{title}} {{id}} <fa-icon [icon]="helpIcon" [matTooltip]="tooltip"></fa-icon><fa-icon [icon]="clearIcon" (click)="clearPersonalized()" class="clear-personalized" matTooltip="Remove constraint"></fa-icon></div>
        </div>
    </div>
    `,
    styles:[`
    .text.person-text {
        flex-grow: 1;
    }
    .clear-personalized {
        font-size: 1.25em;
        float: right;
    }
    .clear-personalized:hover {
        cursor: pointer;
    }
    `]
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
    clearIcon = faTimesCircle;

    constructor(private selectionFactory:VisualizationSelectionFactory) {}

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

    clearPersonalized() {
        clearPersonalized(this.selectionFactory,this.selection);
        if(this.selection.personId) {
            this.selection.personId = undefined;
        }
        if(this.selection.groupId) {
            this.selection.groupId = undefined;
        }
    }

    ngOnInit() {
        this.step.$stepInstance = this;
    }

    get state():StepState {
        return StepState.AVAILABLE;
    }
}