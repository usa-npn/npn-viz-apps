import { Component, Input, PipeTransform, SimpleChanges } from '@angular/core';
import { MapLayer } from './map-layer';
import { MapLayerExtentType } from './gridded-common';
import { GriddedPipeProvider } from './pipes';

import * as d3 from 'd3';



@Component({
    selector: 'extent-control',
    template: `
    <div [ngSwitch]="layer.extentType">
        <extent-date-control *ngSwitchCase="date" [layer]="layer"></extent-date-control>
        <extent-year-control *ngSwitchCase="year" [layer]="layer"></extent-year-control>
        <extent-doy-control *ngSwitchCase="doy" [layer]="layer"></extent-doy-control>
    </div>
    `
})
export class ExtentControl {
    @Input() layer:MapLayer;
    date = MapLayerExtentType.DATE;
    year = MapLayerExtentType.YEAR;
    doy = MapLayerExtentType.DOY;
}

@Component({
    selector: 'extent-date-control',
    template: `
    TODO date extent
    `
})
export class ExtentDateControl {
    @Input() layer:MapLayer;
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
        <div class="current-value">{{layer.extent.current.value | number:'1.0-0'}}</div>
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
    @Input() layer:MapLayer;

    thirtyYearAvgDayOfYear:PipeTransform;
    baseYear:number;
    months:Date [];
    monthDays:number [];

    _selectedMonth:Date;
    _selectedDayOfMonth: number;

    constructor(private pipes:GriddedPipeProvider) {
        this.thirtyYearAvgDayOfYear = pipes.get('thirtyYearAvgDayOfYear');
        this.baseYear = this.thirtyYearAvgDayOfYear.transform(1,true).getFullYear();
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
        const label = this.thirtyYearAvgDayOfYear.transform(this._selectedMonth);
        if(this.layer.extent.current = this.layer.extent.values.reduce((found,v) => found||(v.label === label ? v : undefined),undefined)) {
            this.layer.bounce();
        } else {
            console.warn(`Unable to find valid extent for label "${label}"`);
        }
    }

    ngOnChanges(changes:SimpleChanges):void {
        if(changes.layer && changes.layer.currentValue) {
            const currentDate = this.thirtyYearAvgDayOfYear.transform(this.layer.extent.current.value,true);
            console.log('currentDate',currentDate);
            this.setSelectedMonth(this.months[currentDate.getMonth()]);
            this._selectedDayOfMonth = currentDate.getDate();
        }
    }
}

@Component({
    selector: 'extent-year-control',
    template: `
    TODO year extent
    `
})
export class ExtentYearControl {
    @Input() layer:MapLayer;
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