import {Component, Input, ElementRef} from '@angular/core';

import { ObservableMedia } from "@angular/flex-layout";

import {Window,LegendDoyPipe} from '../../common';
import {VisualizationMargins} from '../visualization-base.component';
import {ONE_DAY_MILLIS} from '../vis-selection';
import {SvgVisualizationBaseComponent,DEFAULT_MARGINS,FONT_SIZE,FONT_SIZE_PX} from '../svg-visualization-base.component';

import {ActivityCurvesSelection} from './activity-curves-selection';

import {Axis,axisBottom,axisLeft} from 'd3-axis';
import {Selection} from 'd3-selection';
import {ScaleLinear,scaleLinear} from 'd3-scale';
import * as d3 from 'd3';

const ROOT_DATE = new Date(2010,0);
const D3_DATE_FMT = d3.timeFormat('%m/%d');
const DATE_FMT = (d) => {
    let time = ((d-1)*ONE_DAY_MILLIS)+ROOT_DATE.getTime(),
        date = new Date(time);
    return D3_DATE_FMT(date);
};
const PAD_DOMAIN = (d,metric) => {
    if(d && d.length === 2) {
        d = [d[0],(d[1]*1.05)];
        if(metric && metric.proportion && d[1] > 1) {
            d[1] = 1.0; // don't allow proportions to overflow for clarity.
        }
    }
    return d;
};

const DOY_INTERVAL_TICK = (interval) => {
    var doy = 1,
        ticks = [];
    while(doy <= 365) {
        ticks.push(doy);
        doy += interval;
    }
    return ticks;
};
const X_TICK_CFG = {
    7: {
        rotate: 45,
        values: DOY_INTERVAL_TICK(14)
    },
    14: {
        rotate: 45,
        values: DOY_INTERVAL_TICK(28)
    },
    months: {
        values: [1,32,60,91,121,152,182,213,244,274,305,335]
    }
};

@Component({
    selector: 'activity-curves',
    templateUrl: '../svg-visualization-base.component.html',
    styleUrls: ['../svg-visualization-base.component.scss']
})
export class ActivityCurvesComponent extends SvgVisualizationBaseComponent {
    @Input() selection: ActivityCurvesSelection;

    x: ScaleLinear<number,number>;
    xAxis: Axis<number>;

    filename:string = 'activity-curves.png';
    margins: VisualizationMargins = {top: 80,left: 80,right: 80,bottom: 80};

    constructor(protected window: Window, protected rootElement: ElementRef,protected media:ObservableMedia,private legendDoyPipe: LegendDoyPipe) {
        super(window,rootElement,media);
    }

    private usingCommonMetric() {
        let selection = this.selection;
        // there are always two curves in the selection, the question is whether they are
        // valid and share a metric
        if((selection.curves[0].isValid() && !selection.curves[1].isValid()) ||
            (selection.curves[0].isValid() && selection.curves[1].isValid() && selection.curves[0].metricId() === selection.curves[1].metricId())) {
            return selection.curves[0].metric;
        }
    }

    private newY() {
        let sizing = this.sizing;
        return scaleLinear().range([sizing.height,0]).domain([0,100]);
    }

    private updateLegend(): void {
        let chart = this.chart;
        chart.select('.legend').remove();
        let sizing = this.sizing,
            selection = this.selection,
            commonMetric = this.usingCommonMetric(),
            legend = chart.append('g')
              .attr('class','legend')
              // the 150 below was picked just based on the site of the 'Activity Curves' title
              .attr('transform','translate(150,-'+(sizing.margin.top-10)+')') // relative to the chart, not the svg
              .style('font-size','1em'),
            /* legend labels can differ greatly in length, don't try to put them
               inside a box that will be impossible to size correctly
            rect = legend.append('rect')
                .style('fill','white')
                .style('stroke','black')
                .style('opacity','0.8')
                .attr('width',100)
                .attr('height',55),*/
            r = 5, vpad = 4;
            selection.curves.reduce((cnt,c) => {
                    var row;
                    if(c.plotted()) {
                        row = legend.append('g')
                            .attr('class','legend-item curve-'+c.id)
                            .attr('transform','translate(10,'+(((cnt+1)*(this.baseFontSize() as number))+(cnt*vpad))+')');
                        row.append('circle')
                            .attr('r',r)
                            .attr('fill',c.color);
                        row.append('text')
                            .style('font-size', this.baseFontSize(true))
                            .attr('x',(2*r))
                            .attr('y',(r/2))
                            .text(c.legendLabel(!commonMetric));
                        cnt++;
                    }
                    return cnt;
                },0);
    }

    private hover():void {
        let svg = this.svg,
            selection = this.selection,
            sizing = this.sizing,
            self = this,
            x = this.x;
        let hover = svg.append('g')
            .attr('transform', 'translate(' + sizing.margin.left + ',' + sizing.margin.top + ')')
            .style('display','none');
        let hoverLine = hover.append('line')
                .attr('class','focus')
                .attr('fill','none')
                .attr('stroke','green')
                .attr('stroke-width',1)
                .attr('x1',0)
                .attr('y1',0)
                .attr('x2',0)
                .attr('y2',sizing.height),
            hoverDoy = hover.append('text')
                .attr('class','focus-doy')
                .attr('y',10)
                .attr('x',0)
                .text('hover doy');
        let focusOff = () => {
                selection.curves.forEach(function(c) { delete c.doyFocus; });
                hover.style('display','none');
                this.updateLegend();
            },
            focusOn = () => {
                // only turn on if something has been plotted
                if(selection.curves.reduce(function(plotted,c){
                        return plotted||c.plotted();
                    },false)) {
                    hover.style('display',null);
                }
            };

        // left as function due to d3's use of this
        function updateFocus() {
            let coords = d3.mouse(this),
                xCoord = coords[0],
                yCoord = coords[1],
                doy = Math.round(x.invert(xCoord)),
                dataPoint = selection.curves.reduce(function(dp,curve){
                    if(!dp && curve.plotted()) {
                        dp = curve.data().reduce(function(found,point){
                            return found||(doy >= point.start_doy && doy <= point.end_doy ? point : undefined);
                        },undefined);
                    }
                    return dp;
                },undefined) as any; // TS thinks dataPoint is an "ActivityCurve"
            hoverLine.attr('transform','translate('+xCoord+')');
            hoverDoy
                .style('text-anchor',doy < 324 ? 'start' : 'end')
                .attr('x',xCoord+(10*(doy < 324 ? 1 : -1)))
                .text(dataPoint ?
                    self.legendDoyPipe.transform(dataPoint.start_doy)+' - '+self.legendDoyPipe.transform(dataPoint.end_doy) :
                    self.legendDoyPipe.transform(doy));
            selection.curves.forEach(function(c) { c.doyFocus = doy; });
            self.updateLegend();
        }
        svg.append('rect')
            .attr('class','overlay')
            .attr('transform', 'translate(' + this.margins.left + ',' + this.margins.top + ')')
            .style('fill','none')
            .style('pointer-events','all')
            .attr('x',0)
            .attr('y',0)
            .attr('width',sizing.width)
            .attr('height',sizing.height)
            .on('mouseover',focusOn)
            .on('mouseout',focusOff)
            .on('mousemove',updateFocus);
    }

    protected reset(): void {
        super.reset();
        let chart = this.chart,
            sizing = this.sizing,
            selection = this.selection;

        this.x = scaleLinear().range([0,sizing.width]).domain([1,365]);
        this.xAxis = axisBottom<number>(this.x).tickFormat(DATE_FMT);

        selection.curves.forEach(c => c.x(this.x).y(this.newY()));

        chart.append('g')
             .attr('class','chart-title')
             .append('text')
             .attr('y', '0')
             .attr('dy','-3em')
             .attr('x', '0')
             .style('text-anchor','start')
             .style('font-size','18px')
             .text('Activity Curves');
        this.commonUpdates();
    }

    protected update(): void {
        this.reset();
        let selection = this.selection;
        selection.loadCurveData().then(() => {
            this.redraw();
        });
    }

    protected redrawSvg(): void {
        let chart = this.chart,
            sizing = this.sizing,
            selection = this.selection,
            commonMetric = this.usingCommonMetric();

        chart.selectAll('g .axis').remove();

        if(commonMetric) {
            // both use the same y-axis domain needs to include all valid curve's data
            let domain = d3.extent(selection.curves.reduce(function(arr,c){
                    if(c.isValid()) {
                        arr = arr.concat(c.domain());
                    }
                    return arr;
                },[])),
                y = this.newY().domain(PAD_DOMAIN(domain,commonMetric));
            console.debug('ActivityCurves.common domain',domain);
            selection.curves.forEach(function(c){
                c.y(y);
            });
        } else {
            selection.curves.forEach(c => {
                // re-initialize y in case a previous plot re-used the same y
                // each has an independent domain
                if(c.isValid()) {
                    c.y(this.newY().domain(PAD_DOMAIN(c.domain(),c.metric)));
                }
            });
        }

        chart.append('g')
            .attr('class', 'y axis left')
            .call(selection.curves[0].axis())
            .append('text')
            .attr('class','axis-title')
            .attr('transform', 'rotate(-90)')
            .attr('y', '0')
            .attr('dy','-4em')
            .attr('x',-1*(sizing.height/2)) // looks odd but to move in the Y we need to change X because of transform
            .attr('fill','#000')
            .style('text-anchor', 'middle')
            .text(selection.curves[0].axisLabel());

        if(!commonMetric && selection.curves[1].isValid()) {
            selection.curves[1].orient = 'right';
            chart.append('g')
                .attr('class', 'y axis right')
                .attr('transform','translate('+sizing.width+')')
                .call(selection.curves[1].axis())
                .append('text')
                .attr('class','axis-title')
                .attr('transform', 'rotate(-90)')
                .attr('y', '0')
                .attr('dy','4em')
                .attr('x',-1*(sizing.height/2)) // looks odd but to move in the Y we need to change X because of transform
                .style('text-anchor', 'middle')
                .text(selection.curves[1].axisLabel());
        }

        let xTickConfig = X_TICK_CFG[selection.frequency.value];
        this.xAxis.tickValues(xTickConfig.values);
        chart.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + sizing.height + ')')
            .call(this.xAxis)
            .append('text')
            .attr('y','0')
            .attr('dy','3em')
            .attr('x',(sizing.width/2))
            .attr('class','axis-label')
            .style('text-anchor', 'middle')
            .text('Date');
        if(xTickConfig.rotate) {
            chart.selectAll('g.x.axis g.tick text')
                .style('text-anchor','end')
                .attr('transform','rotate(-'+xTickConfig.rotate+')');
            chart.selectAll('g.x.axis .axis-label')
                .attr('dy','4em');
        }

        // if not using a common metric (two y-axes)
        // then color the ticks/labels in alignment with their
        // corresponding curve for clarity.
        if(!commonMetric) {
            chart.selectAll('g.y.axis.left g.tick text')
                .style('fill',selection.curves[0].color);
            chart.selectAll('g.y.axis.left text.axis-title')
                .style('fill',selection.curves[0].color);
            chart.selectAll('g.y.axis.right g.tick text')
                .style('fill',selection.curves[1].color);
            chart.selectAll('g.y.axis.right text.axis-title')
                .style('fill',selection.curves[1].color);
        }
        this.commonUpdates();

        // draw the curves
        selection.curves.forEach(function(c) {
            c.draw(chart);
        });

        this.updateLegend();
        this.hover();
    }
}
