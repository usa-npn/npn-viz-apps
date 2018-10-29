import {Component,Input} from '@angular/core';

import {ONE_DAY_MILLIS} from '../vis-selection';
import {CalendarSelection,ObservationDataDataPoint,ObservationDateData} from './calendar-selection';
import {VisualizationMargins} from '../visualization-base.component';
import {SvgVisualizationBaseComponent,DEFAULT_MARGINS} from '../svg-visualization-base.component';

import {Axis,axisBottom,axisRight} from 'd3-axis';
import {Selection} from 'd3-selection';
import {ScaleBand,scaleBand} from 'd3-scale';
import * as d3 from 'd3';

@Component({
    selector: 'calendar',
    templateUrl: '../svg-visualization-base.component.html',
    styleUrls: ['../svg-visualization-base.component.scss']
})
export class CalendarComponent extends SvgVisualizationBaseComponent {
    @Input() selection: CalendarSelection;

    filename:string = 'calendar.png';
    margins: VisualizationMargins = {top: 20, right: 35, bottom: 45, left: 35};

    x: ScaleBand<number>;
    xAxis: Axis<number>;

    y: ScaleBand<number>;
    yAxis: Axis<number>

    private processed:ObservationDateData;
    private data:any[];

    // the doy of the first of each month doesn't change from year to year just what
    // day of the week days fall on so what year is used to calculate them is irrelevant
    xTickValues(): number[] {
        var firsts = [1],i,count = 1;
        for(i = 1; i < 12; i++) {
            var date = new Date(1900,i);
            // back up 1 day
            date.setTime(date.getTime()-ONE_DAY_MILLIS);
            count += date.getDate();
            firsts.push(count);
        }
        return this.x.domain().filter(function(d){
            return firsts.indexOf(d) !== -1;
        });
    }

    protected commonUpdates(): void {
        // forces all text to 14 px
        super.commonUpdates();
        // labels are customizable in size
        let bw = this.y.bandwidth();
        let dy = -1*((bw/2)+this.selection.labelOffset),
            labelFontSize = (this.baseFontSize() as number)+this.selection.fontSizeDelta;
        this.chart.selectAll('.y.axis text')
            .attr('x', 0)
            .attr('dy', dy)
            .attr('style', `text-anchor: start; font-size: ${labelFontSize}px;`);
    }

    private getMonthFormat(): string {
        if(this.selection.monthFormat) {
            return this.selection.monthFormat;
        }
        if(this.sizing && this.sizing.width < 800) {
            return '%b';
        }
        return '%B';
    }

    protected reset(): void {
        super.reset();
        this.processed = undefined;
        let chart = this.chart,
            sizing = this.sizing,
            d3_month_fmt = d3.timeFormat(this.getMonthFormat());

        this.x = scaleBand<number>().range([0,sizing.width]).domain(d3.range(1,366))
            .paddingInner(-0.1).paddingOuter(0.5);
        this.xAxis = axisBottom<number>(this.x).tickValues(this.xTickValues())
            .tickFormat((i) => {
                let date = new Date(1900,0);
                date.setTime(date.getTime()+(ONE_DAY_MILLIS*i));
                return d3_month_fmt(date);
            });
        this.y = scaleBand<number>().range([sizing.height,0]).domain(d3.range(0,6)).paddingOuter(0.5);
        this.yAxis = axisRight<number>(this.y).tickSize(sizing.width).tickFormat(i => {
            return this.processed && this.processed.data && i < this.processed.labels.length ?
                this.processed.labels[i] : '';
        });

        chart.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + sizing.height + ')')
            .call(this.xAxis);

        chart.append('g')
            .attr('class', 'y axis')
            .call(this.yAxis);
        chart.selectAll('g .y.axis line')
            .style('stroke','#777')
            .style('stroke-dasharray','2,2');

        // hide y axis ticks and domain
        //chart.selectAll('g .y.axis .tick line').style('display','none');
        chart.selectAll('g .y.axis .domain').style('display','none');

        this.commonUpdates();
    }

    protected update(): void {
        this.reset();
        this.selection.getData().then(data => {
            this.data = data;
            this.redraw();
        })
        .catch(this.handleError);
    }

    protected redrawSvg(): void {
        if(!this.data) {
            return;
        }
        let sizing = this.sizing,
            processed = this.processed = this.selection.postProcessData(this.data);

        // update y axis
        this.y.paddingInner(this.selection.bandPadding);
        if(processed && processed.labels) {
            this.y.domain(d3.range(0,processed.labels.length));
        }
        this.yAxis.scale(this.y);
        this.chart.selectAll('g .y.axis')
            .call(this.yAxis);

        this.chart.selectAll('.doy').remove();
        if(processed && processed.data) {
            let doys = this.chart.selectAll('.doy').data(processed.data, d => {
                let point = d as ObservationDataDataPoint; // why is this necessary
                return`${point.y}-${point.x}-${point.color}`;
            });
            doys = doys.enter().insert('line',':first-child').attr('class','doy');
            let dx = Math.ceil(this.x.bandwidth()/2),
                dy = this.y.bandwidth()/2;
            doys.attr('x1', d => this.x(d.x)-dx)
                .attr('y1', (d,i) => this.y(d.y)+dy)
                .attr('x2', d => this.x(d.x)+dx)
                .attr('y2', (d,i) => this.y(d.y)+dy)
                .attr('doy-point',d => `(${d.x},${d.y})`)
                .attr('stroke', d => d.color)
                .attr('stroke-width', `${this.y.bandwidth()}`)
                .append('title')
                .text(function(d) {
                    return d.x; // x is the doy
                });
        }
        this.commonUpdates();
    }
}
