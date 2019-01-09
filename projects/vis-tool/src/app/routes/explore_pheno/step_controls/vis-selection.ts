import { Component } from "@angular/core";

import { Subject } from 'rxjs';

import {
    faChartLine,
    faMapMarker,
    faChartNetwork,
    faCalendarAlt,
    faThermometerHalf,
    faInfoCircle
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
        <div *ngFor="let cat of categories">
            <h4>{{cat.title}}</h4>
            <div class="vis-selectors" *ngFor="let v of cat.defs">
                <button mat-raised-button (click)="selection.selected = v;" [color]="selection.selected === v ? 'accent' : null" [ngClass]="{selected: selection.selected === v}">
                    <fa-icon [icon]="v.icon"></fa-icon> {{v.title}}
                </button>
                <div class="info"><fa-icon [icon]="infoIcon"></fa-icon></div>
            </div>
        </div>
    </div>
    `
})
export class VisSelectionControlComponent implements ControlComponent {
    infoIcon = faInfoCircle;
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

    categories:any[] = [{
        title: 'maps',
        defs: this.maps
    },{
        title: 'charts',
        defs: this.charts
    }]
}

export const VisSelectionStep:VisConfigStep = {
    title: 'visualization type',
    icon: faChartLine,
    stepComponent: VisSelectionStepComponent,
    controlComponent: VisSelectionControlComponent
};