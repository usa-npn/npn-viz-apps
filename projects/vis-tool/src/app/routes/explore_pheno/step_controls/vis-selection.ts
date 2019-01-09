import { Component } from "@angular/core";

import { Subject } from 'rxjs';

import {
    faChartLine,
    faMapMarker,
    faChartNetwork,
    faCalendarAlt,
    faThermometerHalf
} from '@fortawesome/pro-light-svg-icons';

import { StepComponent, ControlComponent, VisConfigStep, VisDefinition } from "../interfaces";

export class VisSelectionSelection {
    changes:Subject<VisDefinition> = new Subject();

    private _selected:VisDefinition;
    get selected():VisDefinition { return this._selected; }
    set selected(s:VisDefinition) { this.changes.next(this._selected = s); }
}

@Component({
    template: `{{selection?.selected?.title}}`
})
export class VisSelectionStepComponent implements StepComponent {
}

@Component({
    template: `
    <div>
        <h3>maps</h3>
        <button mat-raised-button *ngFor="let v of maps" (click)="selection.selected = v;">
            <fa-icon [icon]="v.icon"></fa-icon> {{v.title}}
        </button>
        <h3>charts</h3>
        <button mat-raised-button *ngFor="let v of charts" (click)="selection.selected = v;">
            <fa-icon [icon]="v.icon"></fa-icon> {{v.title}}
        </button>
    </div>
    `,
    styles:[`
    :host {

    }
    h3 {
        text-transform: uppercase;
    }
    button {
        display: block;
        width: 100%;
    }
    `]
})
export class VisSelectionControlComponent implements ControlComponent {
    maps:VisDefinition[] = [{
        title: 'Map',
        icon: faMapMarker
    },{
        title: 'Spring onset',
        icon: faThermometerHalf
    }]

    charts:VisDefinition[] = [{
        title: 'Scatter plot',
        icon: faChartNetwork
    },{
        title: 'Activity curve',
        icon: faChartLine
    },{
        title: 'Calendar',
        icon: faCalendarAlt
    }]
}

export const VisSelectionStep:VisConfigStep = {
    title: 'visualization type',
    icon: faChartLine,
    stepComponent: VisSelectionStepComponent,
    controlComponent: VisSelectionControlComponent
};