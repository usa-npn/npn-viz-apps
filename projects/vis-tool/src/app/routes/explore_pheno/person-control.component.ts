import { StepComponent, StepState, VisConfigStep } from './interfaces';
import { VisSelection, VisualizationSelectionFactory, NetworkService } from '@npn/common';
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
            <div class="text person-text">{{title}} <fa-icon [icon]="helpIcon" [matTooltip]="tooltip"></fa-icon><fa-icon [icon]="clearIcon" (click)="clearPersonalized()" class="clear-personalized" matTooltip="Remove constraint"></fa-icon></div>
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

    constructor(private selectionFactory:VisualizationSelectionFactory,
        private networkService:NetworkService) {}


    groupName = '';
    getGroupName(group_id) {
        if(this.groupName == '') {
            this.groupName = '  ';
            this.networkService.getNetwork(group_id).then(network => {
                if(network && network[0] && network[0].name) {
                    this.groupName = network[0].name;
                    return this.groupName;
                } else {
                    this.groupName = 'not found';
                    return 'not found'
                }
            })
        } else {
            return this.groupName;
        }
        
    }

    get id():any {
        return this.selection && this.selection.personId
            ? this.selection.personId
            : this.selection && this.selection.groupId
                ? this.getGroupName(this.selection.groupId)
                : '?';
    }

    get title():string {
        return this.selection && this.selection.personId
            ? `Your Data (User ID: ${this.id})`
            : this.selection && this.selection.groupId
                ? `Group: ${this.id}`
                : '?';
    }

    get tooltip():string {
        if(this.selection && this.selection.personId) {
            return `This visualization is contrained to data collected by User ID: ${this.selection.personId}.`;
        } else if(this.selection && this.selection.groupId) {
            let groupName = this.getGroupName(this.selection.groupId);
            if(groupName == 'not found') {
                return `Group ID ${this.selection.groupId} was not found, please make sure the id is correct in the url.`;
            } else {
                return `This visualization is contrained to data collected by group: ${groupName}.`;
            }
        } else {
            return '';
        }
        
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