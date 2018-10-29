import {Component, Input, OnInit, Pipe, PipeTransform} from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { ClippedWmsMapSelection, ClippedLayerDef } from './clipped-wms-map-selection';
import * as d3 from 'd3';

// wraps DecimalPipe and supplies custom formatting for specific layers for mean/min/max
@Pipe({
    name: 'clippedStatValue'
})
export class ClippedStatValuePipe implements PipeTransform {
    readonly dateFormat = d3.timeFormat('%B %e');
    constructor(private decimalPipe:DecimalPipe) {}
    transform(value:any,nFormat:string,layer:ClippedLayerDef):any {
        if(layer && layer.layerName === 'si-x:leaf_anomaly') {
            let transformed = this.decimalPipe.transform(Math.abs(value),nFormat);
            if(value < 0) {
                return `${transformed} days early`;
            } else {
                return `${transformed} days late`;
            }
        }
        // for non-anomaly maps value is DOY, display as date with DOY in parens.
        const rounded = Math.floor(value);
        const dateFmt = this.dateFormat(this.getDate(rounded));
        return `${dateFmt} (${rounded})`;
    }

    private getDate(rounded:number):Date {
        const d = new Date(2010,0,1); // 2010 not a leap year
        d.setTime(d.getTime()+((rounded-1)*24*60*60*1000));
        return d;
    }
}

const COUNT_TT = 'Number of map pixels included in the calculations';
const SIX_COMPLETE = 'Proportion of area that has reached the First Leaf Index';
const AGDD_COMPLETE = 'Highest amount of warmth accumulated since Jan 1 in the area, measured in growing degree days (GDDs)';

const SIX_TOOLTIPS = {
    count: COUNT_TT,
    mean: 'Mean day of year First Leaf Index was reached',
    stdDev: 'Standard deviation of mean day of year First Leaf Index was reached',
    min: 'Earliest day of year First Leaf Index was reached',
    max: 'Latest day of year First Leaf Index was reached',
    complete: SIX_COMPLETE
};
const AGDD_TOOLTIPS = {
    count: COUNT_TT,
    mean: 'Warmth accumulated since Jan 1, averaged across the area, measured in growing degree days (GDDs)',
    stdDev: 'Standard deviation in warmth accumulated since Jan 1, averaged across the area, measured in growing degree days (GDDs)',
    min: 'Lowest amount of warmth accumulated since Jan 1 in the area, measured in growing degree days (GDDs)',
    max: AGDD_COMPLETE
};
const SIX_ANOMALY_TOOLTIPS = {
    count: COUNT_TT,
    mean: 'Measure of how early or late spring arrived in this area this year compared to long-term average. Calculated as average of values for pixels displayed',
    stdDev: 'The standard deviation of the average number of days different from a long-term average (1981-2010) for the pixels displayed',
    min: 'Earliest day compared to a long-term average (1981-2010) for the pixels displayed',
    max: 'Latest day compared to a long-term average (1981-2010) for the pixels displayed',
    complete: SIX_COMPLETE
};
const AGDD_ANOMALY_TOOLTIPS = {
    count: COUNT_TT,
    mean: 'Difference in the warmth accumulated since Jan 1 from a long-term average (1981-2010), measured in growing degree days (GDDs)',
    stdDev: 'Standard deviation in difference in the warmth accumulated since Jan 1 from a long-term average (1981-2010), measured in growing degree days (GDDs)',
    min: 'Lowest difference in the warmth accumulated since Jan 1 from a long-term average (1981-2010), measured in growing degree days (GDDs)',
    max: 'Highest difference in the warmth accumulated since Jan 1 from a long-term average (1981-2010), measured in growing degree days (GDDs)',
    complete: AGDD_COMPLETE
};
@Component({
    selector: 'clipped-wms-map-statistics',
    template: `
    <table *ngIf="statistics" [ngClass]="{'no-data': statistics.count === 0}">
        <tbody>
            <tr><td>Date</td><td>{{statistics.date | date:'longDate'}}</td></tr>
            <tr *ngIf="statistics.count !== 0" [matTooltip]="tooltips['count']"><td>Count</td><td>{{statistics.count}}</td></tr>
            <tr *ngIf="statistics.count !== 0" [matTooltip]="tooltips['mean']"><td>Mean</td><td>{{statistics.mean | clippedStatValue:'1.1-1':selection.layer}}</td></tr>
            <tr *ngIf="statistics.count !== 0" [matTooltip]="tooltips['stdDev']"><td>Std Dev</td><td>{{statistics.stddev | number:'1.1-1'}}</td></tr>
            <tr *ngIf="statistics.count !== 0" [matTooltip]="tooltips['min']"><td>Min</td><td>{{statistics.min  | clippedStatValue:'1.0-1':selection.layer}}</td></tr>
            <tr *ngIf="statistics.count !== 0" [matTooltip]="tooltips['max']"><td>Max</td><td>{{statistics.max  | clippedStatValue:'1.0-1':selection.layer}}</td></tr>
            <tr *ngIf="!gdd && statistics.count !== 0" [matTooltip]="tooltips['complete']"><td>Complete</td><td>{{statistics.percentComplete | number:'1.0-1'}}%</td></tr>
            <tr><td *ngIf="statistics.count === 0 && selection.layer.noDataDisclaimer" colspan="2" class="no-data-disclaimer">{{selection.layer.noDataDisclaimer}}</td></tr>
        </tbody>
    </table>
    `,
    styles:[`
        :host {
            line-height: 12px;
        }
        table.no-data {
            max-width: 250px;
        }
        tr td:first-of-type {
            font-weight: bold;
            text-align: right;
            padding-right: 5px;
        }
        tr td:first-of-type:after {
            content: ':';
        }
        tr td.no-data-disclaimer {
            text-align: center;
        }
        tr td.no-data-disclaimer:after {
            content: '';
        }
    `],
    providers: [ClippedStatValuePipe]
})
export class ClippedWmsMapStatisticsComponent {
    @Input()
    selection:ClippedWmsMapSelection;

    statistics:any;
    gdd:boolean;
    tooltips:any;

    ngDoCheck() {
        if(this.selection && this.selection.data && this.selection.data.statistics) {
            this.statistics = this.selection.data.statistics;
            this.gdd = this.selection && /^gdd/.test(this.selection.layer.layerName);
            this.tooltips = this.gdd ?
                (this.selection.layer.id === 'anomaly' ? AGDD_ANOMALY_TOOLTIPS : AGDD_TOOLTIPS) :
                (this.selection.layer.id === 'anomaly' ? SIX_ANOMALY_TOOLTIPS : SIX_TOOLTIPS);
        }
    }
}
