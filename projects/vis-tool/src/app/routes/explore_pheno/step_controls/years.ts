import { VisConfigStep, StepState } from "../interfaces";

import { faCalendarAlt } from '@fortawesome/pro-light-svg-icons';
import { Component, ViewEncapsulation } from "@angular/core";
import { BaseStepComponent, BaseControlComponent } from "./base";

@Component({
    template: `{{(selection.years||[]).join(', ')}}`
})
export class YearsStepComponent extends BaseStepComponent {
    title:string = 'Years';

    get state():StepState {
        return this.selection.years && this.selection.years.length
            ? StepState.COMPLETE
            : StepState.AVAILABLE;
    }
}

const THIS_YEAR = (new Date()).getFullYear();
const VALID_YEARS = (function(){
    let max = THIS_YEAR+1,
        current = 1900,
        years:number[] = [];
    while(current < max) {
        years.push(current++);
    }
    return years;
})();

@Component({
    template: `
    <div class="year-input-wrapper" *ngFor="let plotYear of selection.years;index as idx">
        <mat-form-field class="year-input">
            <mat-select placeholder="Year {{idx+1}}" [(ngModel)]="selection.years[idx]" (ngModelChange)="selection.update()" id="year_{{idx}}">
                <mat-option *ngFor="let y of selectableYears(selection.years[idx])" [value]="y">{{y}}</mat-option>
            </mat-select>
        </mat-form-field>
        <button *ngIf="idx > 0 || selection.years.length > 1" mat-button class="remove-year" (click)="removeYear(idx)">Remove</button>
        <button *ngIf="selection.years.length < 6 && idx === (selection.years.length-1)" mat-button class="add-year" (click)="addYear()">Add</button>
    </div>
    `,
    styles:[`
    .year-input-wrapper {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
    }
    .year-input-wrapper>button {
        margin-left: 5px;
    }
    `],
    encapsulation: ViewEncapsulation.None
})
export class YearsControlComponent extends BaseControlComponent {
    title:string = 'Select years to plot';
    maxYears = 5;

    stepVisit() {
        if(this.selection.years.length === 0) {
            this.addYear();
        }
    }

    selectableYears(y:number) {
        if(y) {
            // validYears including y but excluding any others in the selection
            return VALID_YEARS.filter(yr => {
                return yr === y || this.selection.years.indexOf(yr) === -1;
            });
        }
        return VALID_YEARS;
    }

    addYear() {
        let y = THIS_YEAR;
        while(this.selection.years.indexOf(y) !== -1) {
            y--;
        }
        this.selection.years.push(y);
        this.selection.update();
    }

    removeYear(index:number) {
        this.selection.years.splice(index,1);
        this.selection.update();
    }
}

export const YearsStep:VisConfigStep = {
    icon: faCalendarAlt,
    stepComponent: YearsStepComponent,
    controlComponent: YearsControlComponent
};