import {Component,Input,OnInit} from '@angular/core';

import {CalendarSelection} from './calendar-selection';
import { HigherSpeciesPhenophaseInputCriteria } from '../common-controls';
import { filter, debounceTime, takeUntil } from 'rxjs/operators';
import { VisSelectionEvent } from '../vis-selection';
import { MonitorsDestroy } from '@npn/common/common';

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
    selector: 'calendar-control',
    template: `
    <div>
        <div class="year-input-wrapper" *ngFor="let plotYear of selection.years;index as idx">
            <mat-form-field class="year-input">
                <mat-select placeholder="Year {{idx+1}}" [(ngModel)]="selection.years[idx]" (ngModelChange)="yearChange()" id="year_{{idx}}">
                    <mat-option *ngFor="let y of selectableYears(selection.years[idx])" [value]="y">{{y}}</mat-option>
                </mat-select>
            </mat-form-field>
            <button *ngIf="idx > 0" mat-button class="remove-year" (click)="removeYear(idx)">Remove</button>
            <button *ngIf="selection.years.length < 6 && idx === (selection.years.length-1)" mat-button class="add-year" (click)="addYear()">Add</button>
        </div>
    </div>

    <div class="phenophase-input-wrapper" *ngFor="let spi of selection.plots; index as idx">
        <higher-species-phenophase-input
            gatherColor="true"
            [selection]="selection"
            [criteria]="criteria"
            [plot]="spi"
            (plotChange)="selection.update()"></higher-species-phenophase-input>
        <button *ngIf="idx > 0" mat-button class="remove-plot" (click)="removePlot(idx)">Remove</button>
        <button *ngIf="idx === (selection.plots.length-1)" mat-button class="add-plot" [disabled]="!plotsValid()" (click)="addPlot()">Add</button>
    </div>

    <mat-checkbox [(ngModel)]="selection.negative" (change)="redrawChange()">Display negative data</mat-checkbox>

    <label for="label-size-input">Label size
        <mat-slider id="label-size-input" min="0" max="10" step="0.25" [(ngModel)]="selection.fontSizeDelta" (change)="redrawChange()" [disabled]="!selection.isValid()"></mat-slider>
    </label>

    <label for="label-position-input">Label position
        <mat-slider id="label-position-input" min="0" max="100" step="1" [(ngModel)]="selection.labelOffset" (change)="redrawChange()" [disabled]="!selection.isValid()"></mat-slider>
    </label>

    <label for="label-band-size-input">Band size
        <mat-slider invert id="label-band-size-input" min="0" max="0.95" step="0.05" [(ngModel)]="selection.bandPadding" (change)="redrawChange()" [disabled]="!selection.isValid()"></mat-slider>
    </label>
    `,
    styles:[`
        .year-input-wrapper {
            display: inline-block;
            margin-right: 15px;
        }
        .year-input {
            width: 60px;
        }
        .phenophase-input-wrapper {
            display: block;
        }
        label[for="label-size-input"] {
            margin-left: 15px;
        }
    `]
})
export class CalendarControlComponent extends MonitorsDestroy {
    @Input()
    selection: CalendarSelection;
    maxYears = 5;
    criteria:HigherSpeciesPhenophaseInputCriteria;

    selectableYears(y:number) {
        if(y) {
            // validYears including y but excluding any others in the selection
            return VALID_YEARS.filter(yr => {
                return yr === y || this.selection.years.indexOf(yr) === -1;
            });
        }
        return VALID_YEARS;
    }

    ngOnInit() {
        this.selection.pipe(
            filter(event => event === VisSelectionEvent.SCOPE_CHANGE),
            debounceTime(500),
            takeUntil(this.componentDestroyed)
        ).subscribe(() => this.updateCriteria());
        
        if(this.selection.years.length === 0) {
            this.addYear();
        }
        if(this.selection.plots.length === 0) {
            this.addPlot();
        }
        setTimeout(() => this.updateCriteria());
    }

    updateCriteria() {
        this.criteria = {
            years: this.selection.years,
            stationIds: this.selection.getStationIds()
        };
    }

    yearChange() {
        this.updateCriteria();
        this.selection.update();
    }

    redrawChange(change?) {
        if(change && !change.oldValue && change.newValue) { // e.g. no color to a color means a plot that wasn't valid is now potentially valid.
            this.selection.update();
        } else {
            this.selection.redraw();
        }
    }

    addPlot() {
        this.selection.plots.push({});
    }

    removePlot(index:number) {
        this.selection.plots.splice(index,1);
        this.selection.update();
    }

    addYear() {
        let y = THIS_YEAR;
        while(this.selection.years.indexOf(y) !== -1) {
            y--;
        }
        this.selection.years.push(y);
        this.yearChange();
    }

    removeYear(index:number) {
        this.selection.years.splice(index,1);
        this.yearChange();
    }

    plotsValid() {
        return this.selection.plots.length === this.selection.validPlots.length;
    }
}
