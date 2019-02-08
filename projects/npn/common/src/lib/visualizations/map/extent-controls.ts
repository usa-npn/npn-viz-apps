import { Component, Input, PipeTransform } from '@angular/core';

import {
    MapLayer,
    MapLayerExtentType,
    MapLayerExtentValue,
    GriddedPipeProvider,
    DoyTxType
} from '../../gridded';

import * as d3 from 'd3';
import { MapSelection } from './map-selection';

@Component({
    selector: 'extent-control',
    template: `
    <div [ngSwitch]="selection.layer.extentType">
        <extent-date-control *ngSwitchCase="date" [selection]="selection"></extent-date-control>
        <extent-year-control *ngSwitchCase="year" [selection]="selection"></extent-year-control>
        <extent-doy-control *ngSwitchCase="doy" [selection]="selection"></extent-doy-control>
    </div>
    `
})
export class ExtentControl {
    @Input() selection:MapSelection;
    date = MapLayerExtentType.DATE;
    year = MapLayerExtentType.YEAR;
    doy = MapLayerExtentType.DOY;
}

@Component({
    selector: 'extent-date-control',
    template: `
    <h4>Date</h4>
    <mat-form-field>
        <input matInput [matDatepicker]="extentDatePicker" [min]="minDate" [max]="maxDate" [value]="selectedDate"
            (dateChange)="selectedDate = $event.value">
        <mat-datepicker-toggle matSuffix [for]="extentDatePicker"></mat-datepicker-toggle>
        <mat-datepicker #extentDatePicker></mat-datepicker>
    </mat-form-field>
    `
})
export class ExtentDateControl {
    @Input() selection:MapSelection;

    _selectedDate:Date;
    minDate:Date;
    maxDate:Date;

    set selectedDate(d:Date) {
        d.setHours(0,0,0,0);
        this._selectedDate = d;
        this.selection.extentValue = d.toISOString().replace(/T.*Z$/,'T00:00:00.000Z');
    }
    get selectedDate():Date {
        return this._selectedDate;
    }

    private lastLayer:MapLayer;
    ngDoCheck():void {
        if(this.selection.layer !== this.lastLayer) {
            const layer = this.lastLayer = this.selection.layer;
            if(layer) {
                this.minDate = layer.extent.values[0].date;
                this.maxDate = layer.extent.values[layer.extent.values.length-1].date;
                this.selectedDate = layer.extent.current.date;
            }
        }
    }
}

@Component({
    selector: 'extent-doy-control',
    template: `
    <h4>Day of year</h4>
    <div class="controls">
        <mat-form-field>
            <mat-select placeholder="Month" [(value)]="selectedMonth">
                <mat-option *ngFor="let m of months" [value]="m">{{m | date:'MMMM'}}</mat-option>
            </mat-select>
        </mat-form-field>
        <mat-form-field>
            <mat-select placeholder="Day" [(value)]="selectedDayOfMonth">
                <mat-option *ngFor="let d of monthDays" [value]="d">{{d}}</mat-option>
            </mat-select>
        </mat-form-field>
        <div class="current-value">{{selection?.layer?.extent.current.value | number:'1.0-0'}}</div>
    </div>
    `,
    styles:[`
    .controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    `]
})
export class ExtentDoyControl {
    @Input() selection:MapSelection;

    thirtyYearAvgDayOfYear:PipeTransform;
    baseYear:number;
    months:Date [];
    monthDays:number [];

    _selectedMonth:Date;
    _selectedDayOfMonth: number;

    constructor(private pipes:GriddedPipeProvider) {
        this.thirtyYearAvgDayOfYear = pipes.get('thirtyYearAvgDayOfYear');
        this.baseYear = this.thirtyYearAvgDayOfYear.transform('1.0',DoyTxType.DATE).getFullYear();
        this.months = d3.range(0,12).map(m => new Date(this.baseYear,m));
    }

    get selectedMonth():Date {
        return this._selectedMonth;
    }
    set selectedMonth(d:Date) {
        this.setSelectedMonth(d);
        // user changed month
        this.selectedDayOfMonth = 1;
    }

    private setSelectedMonth(d:Date) {
        this._selectedMonth = d;
        this.monthDays = d3.range(1,getDaysInMonth(d)+1);
    }

    get selectedDayOfMonth():number { return this._selectedDayOfMonth; }
    set selectedDayOfMonth(d:number) {
        this._selectedDayOfMonth = d;
        this._selectedMonth.setDate(d);
        this.selection.extentValue = this.thirtyYearAvgDayOfYear.transform(this._selectedMonth,DoyTxType.DOY_STRING);
    }

    private lastLayer:MapLayer;
    ngDoCheck():void {
        if(this.selection.layer !== this.lastLayer) {
            const layer = this.lastLayer = this.selection.layer;
            if(layer) {
                const currentDate = this.thirtyYearAvgDayOfYear.transform(layer.extent.current.value,true);
                this.setSelectedMonth(this.months[currentDate.getMonth()]);
                this.selectedDayOfMonth = currentDate.getDate();
            }
        }
    }
}

@Component({
    selector: 'extent-year-control',
    template: `
    <h4>Year</h4>
    <mat-form-field>
        <mat-select placeholder="Year" [(value)]="selectedExtent">
            <mat-option *ngFor="let ext of selection.layer?.extent.values" [value]="ext">{{ext.label}}</mat-option>
        </mat-select>
    </mat-form-field>
    `
})
export class ExtentYearControl {
    @Input() selection:MapSelection;

    _selectedExtent:MapLayerExtentValue;

    get selectedExtent():MapLayerExtentValue { return this._selectedExtent; }
    set selectedExtent(ext:MapLayerExtentValue) {
        this._selectedExtent = ext;
        this.selection.extentValue = ext.value;
    }

    private lastLayer:MapLayer;
    ngDoCheck():void {
        if(this.selection.layer !== this.lastLayer) {
            const layer = this.lastLayer = this.selection.layer;
            if(layer) {
                this.selectedExtent = layer.extent.current;
            }
        }
    }
}


const ONE_DAY = (24*60*60*1000);

function getDaysInMonth(date:Date):number {
    let month = date.getMonth(),
        tmp;
    if(month === 11) {
        return 31;
    }
    tmp = new Date(date.getTime());
    tmp.setDate(1);
    tmp.setMonth(tmp.getMonth()+1);
    tmp.setTime(tmp.getTime()-ONE_DAY);
    console.debug('last day of month '+(month+1)+' is '+tmp);
    return tmp.getDate();
}