import { StepComponent, StepState, VisConfigStep } from './interfaces';
import { VisSelection } from '@npn/common';
import { Input, Component, EventEmitter, Output } from '@angular/core';
import { faSyncAlt } from '@fortawesome/pro-light-svg-icons';

@Component({
    selector: `reset-visualization`,
    template: `
    <div class="step">
        <div class="step-title alt" [ngClass]="{unavailable: state === 'unavailable'}">
            <step-icon [step]="step"></step-icon>
            <div class="text">{{title}}</div>
        </div>
        <div class="step-host">
            <div *ngIf="!!selection">
                <button mat-stroked-button color="accent" (click)="reset.emit(nul)">Reset visualization</button>
            </div>
        </div>
    </div>
    `
})
export class ResetControlComponent implements StepComponent {
    title:string = 'reset visualization';
    @Input() selection:VisSelection;
    @Output() reset: EventEmitter<any> = new EventEmitter();
    step:VisConfigStep = {
        icon: faSyncAlt,
        stepComponent: ResetControlComponent,
        controlComponent: null
    };

    ngOnInit() {
        this.step.$stepInstance = this;
    }

    get state():StepState {
        return !!this.selection
            ? StepState.AVAILABLE
            : StepState.UNAVAILABLE;
    }
}