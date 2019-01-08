import { Component, Input, HostBinding } from "@angular/core";

export interface StepStates {
    [x:string]:string;
}

@Component({
    selector: 'step-icon',
    template: `<fa-icon [icon]="icon"></fa-icon>`,
    styles:[`
    :host {
        display: inline-block;
        border: 1px solid red;
    }
    `]

})
export class StepIconComponent {
    @HostBinding('class') @Input() state;
    @Input() icon;
}