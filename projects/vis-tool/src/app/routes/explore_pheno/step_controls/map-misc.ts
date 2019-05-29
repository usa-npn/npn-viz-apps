import { VisConfigStep, StepState } from "../interfaces";

import { faBars } from '@fortawesome/pro-light-svg-icons';
import { Component } from "@angular/core";
import { MapSelection } from "@npn/common";
import { BaseStepComponent, BaseControlComponent } from "./base";

@Component({
    template: `
    <div class="misc" *ngIf="complete">
        <div><label>Data precision filter</label> {{selection.numDaysQualityFilter}} days</div>
        <div><label>Exclude less precise data</label> {{selection.filterLqdSummary ? 'Yes' : 'No'}}</div>
    </div>
    `,
    styles: [`
    .misc {
        display: flex;
        flex-direction: column;
    }
    .misc >div {
        padding-bottom: 5px;
    }
    label {
        font-weight: 600;
    }
    label:after {
        content: ':';
    }
    `]
})
export class MapMiscStepComponent extends BaseStepComponent {
    title:string = 'Behavior';
    selection: MapSelection;

    get state():StepState {
        return !this.selection.validPlots.length || !this.selection.year
            ? StepState.UNAVAILABLE
            : this.visited
                ? StepState.COMPLETE
                : StepState.AVAILABLE
    }
}

@Component({
    template: `
    <mat-form-field>
        <mat-select placeholder="Data precision filter" [(value)]="selection.numDaysQualityFilter">
            <mat-option [value]="7">7 days</mat-option>
            <mat-option [value]="14">14 days</mat-option>
            <mat-option [value]="30">30 days</mat-option>
        </mat-select>
    </mat-form-field>

    <h4 class="misc-title exclude">Exclude less precise data</h4>
    <mat-radio-group [(ngModel)]="selection.filterLqdSummary">
        <mat-radio-button [value]="true">Yes</mat-radio-button>
        <mat-radio-button [value]="false">No</mat-radio-button>
    </mat-radio-group>
    `,
    styles:[`
    :host {
        display: flex;
        flex-direction: column;
    }
    :host >* {
        margin-bottom: 5px;
    }
    .misc-title {
        text-transform: none !important;
    }
    .misc-title.exclude {
        margin-top: 0px;
    }
    mat-radio-button {
        margin-right: 5px;
    }
    `]
})
export class MapMiscControlComponent extends BaseControlComponent {
    title:string = 'Select visualization behavior';
    protected defaultPropertyKeys:string[] = ['filterLqdSummary','numDaysQualityFilter'];
    selection: MapSelection;

    stepVisit():void {
        const firstVisit = !this.visited;
        super.stepVisit();
        if(firstVisit) {
            this.selection.update();
        }
    }
}

export const MapMiscStep:VisConfigStep = {
    icon: faBars,
    stepComponent: MapMiscStepComponent,
    controlComponent: MapMiscControlComponent
};