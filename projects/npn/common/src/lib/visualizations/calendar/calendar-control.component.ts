import {Component,Input,OnInit} from '@angular/core';

import {CalendarSelection} from './calendar-selection';
import { HigherSpeciesPhenophaseInputCriteria } from '../common-controls';
import { filter, debounceTime, takeUntil } from 'rxjs/operators';
import { VisSelectionEvent } from '../vis-selection';
import { MonitorsDestroy, CURRENT_YEAR, CURRENT_YEAR_LABEL  } from '@npn/common/common';
import { faExclamationTriangle } from '@fortawesome/pro-light-svg-icons';

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
    <div *ngIf="!selection.canAddPlot" class="max-plots-reached"><fa-icon [icon]="faExclamationTriangle"></fa-icon> One more year or species/phenophase combination would exceed the maximum of {{selection.MAX_PLOTS}} plots</div>
    <div>
        <div class="year-input-wrapper" *ngFor="let plotYear of selection.years;index as idx">
            <mat-form-field class="year-input">
                <mat-select placeholder="Year {{idx+1}}" [(ngModel)]="selection.years[idx]" (ngModelChange)="yearChange()" id="year_{{idx}}">
                    <mat-option *ngFor="let y of selectableYears(selection.years[idx])" [value]="y">{{y === CURRENT_YEAR ? CURRENT_YEAR_LABEL : y}}</mat-option>
                </mat-select>
            </mat-form-field>
            <button *ngIf="selection.years?.length > 0" mat-button class="remove-year" (click)="removeYear(idx)">Remove</button>
            <button *ngIf="idx === (selection.years.length-1)" mat-button class="add-year" (click)="addYear()" [disabled]="!selection.canAddPlot">Add</button>
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
        <button *ngIf="idx === (selection.plots.length-1)" mat-button class="add-plot" (click)="addPlot()" [disabled]="!plotsValid() || !selection.canAddPlot">Add</button>
    </div>

    <mat-checkbox [(ngModel)]="selection.negative" (change)="redrawChange()">Display negative data</mat-checkbox>
    <mat-checkbox [(ngModel)]="selection.meta.userNegativeToggle" *ngIf="onVisControlOptions" class="meta-userNegativeToggle">Allow users to toggle negative data</mat-checkbox>

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
            width: 90px;
        }
        .phenophase-input-wrapper {
            display: block;
        }
        label[for="label-size-input"],
        .meta-userNegativeToggle {
            margin-left: 15px;
        }
    `]
})
export class CalendarControlComponent extends MonitorsDestroy {
    @Input()
    selection: CalendarSelection;
    /** set to true if want to gather input about allowing users to have visualization time controls */
    @Input()
    onVisControlOptions:boolean = false;
    @Input()
    allowCurrentYear:boolean = false;

    maxYears = 5;
    criteria:HigherSpeciesPhenophaseInputCriteria;
    faExclamationTriangle = faExclamationTriangle;

    validYears = VALID_YEARS.slice();
    CURRENT_YEAR = CURRENT_YEAR;
    CURRENT_YEAR_LABEL = CURRENT_YEAR_LABEL;

    selectableYears(y:number) {
        if(y) {
            // validYears including y but excluding any others in the selection
            return this.validYears.filter(yr => {
                return yr === y || this.selection.years.indexOf(yr) === -1;
            });
        }
        return this.validYears;
    }

    ngOnInit() {
        if(this.onVisControlOptions) {
            this.selection.meta = this.selection.meta||{};
        }
        if(this.allowCurrentYear) {
            this.validYears.push(CURRENT_YEAR);
        }
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
