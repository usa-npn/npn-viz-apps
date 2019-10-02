import { VisConfigStep, StepState } from "../interfaces";

import { faBars } from '@fortawesome/pro-light-svg-icons';
import { Component } from "@angular/core";
import { MapSelection } from "@npn/common";
import { BaseStepComponent, BaseControlComponent } from "./base";

@Component({
    template: `
    <div class="misc" *ngIf="complete">
        <div><label>Data precision filter</label> {{selection.numDaysQualityFilter}} days</div>
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
        return this.selection.validForData()
            ? StepState.COMPLETE
            : this.selection.year && this.selection.validPlots.length > 0
                ? StepState.AVAILABLE
                : StepState.UNAVAILABLE;
    }
}

@Component({
    template: `
    <mat-form-field matTooltip="Less precise data is removed from the scatter plot and map visualizations by only plotting data points preceded or followed by a “no” within 30 days. This filter can be adjusted here to 7, 14, or 30 days.">
        <mat-select placeholder="Data precision filter" [(value)]="selection.numDaysQualityFilter">
            <mat-option [value]="7">7 days</mat-option>
            <mat-option [value]="14">14 days</mat-option>
            <mat-option [value]="30">30 days</mat-option>
        </mat-select>
    </mat-form-field>
    `,
    styles:[`
    :host {
        display: flex;
        flex-direction: column;
    }
    :host >* {
        margin-bottom: 5px;
    }
    `]
})
export class MapMiscControlComponent extends BaseControlComponent {
    title:string = 'Select visualization behavior';
    protected defaultPropertyKeys:string[] = ['numDaysQualityFilter'];
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