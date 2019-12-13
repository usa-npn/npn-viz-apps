import { Component, Input, ElementRef } from '@angular/core';

import { ObservableMedia } from "@angular/flex-layout";

import { LegendDoyPipe } from '../../common';
import { VisualizationMargins } from '../visualization-base.component';
import { ONE_DAY_MILLIS } from '../vis-selection';
import { SvgVisualizationBaseComponent } from '../svg-visualization-base.component';

import { ActivityCurvesSelection } from './activity-curves-selection';

import { Axis, axisBottom } from 'd3-axis';
import { ScaleLinear, scaleLinear } from 'd3-scale';
import * as d3 from 'd3';
import { ActivityCurve } from './activity-curve';

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

    constructor(protected rootElement: ElementRef,protected media:ObservableMedia,private legendDoyPipe: LegendDoyPipe) {
        super(rootElement,media);
    }

    /**
     * Organizes the valid curves into a map of metric to curves using that metric.
     */
    private byMetric() {
        return this.selection.validCurves.reduce((map,c) => {
            map[c.metric.id] = map[c.metric.id]||{
                metric: c.metric,
                curves: []
            };
            map[c.metric.id].curves.push(c);
            return map;
        },{});
    }

    /**
     * Tests to see if the curves are all using the same metric.
     */
    private usingCommonMetric() {
        const validCurves = this.selection.validCurves;
        // could be byMetric().length === 1 but this could be more performant
        return validCurves.length > 0
            // all curves using same metric.
            ? validCurves.reduce((metric,curve) => metric === curve.metric ? metric : undefined,
                validCurves[0].metric)
            : undefined;
    }

    private newY() {
        let sizing = this.sizing;
        return scaleLinear().range([sizing.height,0]).domain([0,100]);
    }

    private updateLegend(): void {
        const {chart,sizing,selection} = this;
        chart.select('.legend').remove();
        const commonMetric = this.usingCommonMetric();
        const legend = chart.append('g')
                .attr('class','legend')
                // the 150 below was picked just based on the site of the 'Activity Curves' title
                .attr('transform',`translate(90,-${sizing.margin.top-10})`) // relative to the chart, not the svg
                .style('font-size','1em');
        const r = 5, vpad = 4;
        
        let rowIndex = 0;
        let inRow = 0;
        let xTrans = 0;
        const maxInRow = 3;
        // TODO each curve (plot) may now actually draw multiple curves
        selection.validCurves.forEach((c) => {
                if(c.plotted()) {
                    const yTrans = (((inRow+1)*(this.baseFontSize() as number))+(inRow*vpad));
                    const legendItem = legend.append('g')
                        .attr('class',`legend-item curve-${c.id} row-${rowIndex}`)
                        .attr('transform',`translate(${xTrans},${yTrans})`);
                    legendItem.append('circle')
                        .attr('r',r)
                        .attr('fill',c.color);
                    legendItem.append('text')
                        .style('font-size', this.baseFontSize(true))
                        .attr('x',(2*r))
                        .attr('y',(r/2))
                        .text(c.legendLabel(!commonMetric));
                    if(++inRow === maxInRow) {
                        const items = legend.selectAll(`.legend-item.row-${rowIndex}`);
                        // based on children added calculate the current row width
                        // and add it to how far we move items in the x direction
                        let maxWidth = 0;
                        items.each(function() {
                            let w = (r*2)+10; // diameter of circle plue some padding
                            d3.select(this)
                                .selectAll('text')
                                .each(function() {
                                    w += (this as any).getBBox().width;
                                });
                            if(w > maxWidth) {
                                maxWidth = w;
                            }
                        });
                        rowIndex++;
                        xTrans += maxWidth;
                        inRow = 0;
                    }
                }
            });
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
                selection.validCurves.forEach(function(c) { delete c.doyFocus; });
                hover.style('display','none');
                this.updateLegend();
            },
            focusOn = () => {
                // only turn on if something has been plotted
                if(selection.validCurves.reduce(function(plotted,c){
                        return plotted||c.plotted();
                    },false)) {
                    hover.style('display',null);
                }
            };

        // left as function due to d3's use of `this`
        function updateFocus() {
            let coords = d3.mouse(this),
                xCoord = coords[0],
                yCoord = coords[1],
                doy = Math.round(x.invert(xCoord)),
                validCurves = selection.validCurves,
                dataPoint = validCurves.reduce(function(dp,curve){
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
            validCurves.forEach(function(c) { c.doyFocus = doy; });
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

        selection.validCurves.forEach(c => c.x(this.x).y(this.newY()));

        chart.append('g')
             .attr('class','chart-title')
             .append('text')
             .attr('y', '0')
             .attr('dy','-3em')
             .attr('x', '0')
             .attr('dx','-3em')
             .style('text-anchor','start')
             .style('font-size','18px')
             .text('Activity Curves');
        this.commonUpdates();
    }

    protected update(): void {
        this.reset();
        let selection = this.selection;
        selection.loadCurveData().then(() => this.redraw());
    }

    protected redrawSvg(): void {
        let chart = this.chart,
            sizing = this.sizing,
            selection = this.selection,
            validCurves = selection.validCurves;

        chart.selectAll('g .axis').remove();

        const mapped = this.byMetric();
        const metricIds = Object.keys(mapped);
        metricIds.forEach(metricId => {
            const metric = mapped[metricId].metric;
            const curves:ActivityCurve[] = mapped[metricId].curves;
            
            // build domain that encapsulates all curves using a given metric
            const domain = d3.extent(curves.reduce((arr,c) => arr.concat(c.domain()),[]));
            const y = this.newY().domain(PAD_DOMAIN(domain,metric));
            curves.forEach(c => c.y(y));
        });

        metricIds.forEach((metricId,index) => {
            const orientation = index === 0 ? 'left' : 'right';
            const primaryCurve:ActivityCurve = mapped[metricId].curves[0];
            primaryCurve.orient = orientation;
            chart.append('g')
                .attr('class', `y axis ${orientation} ${metricId}`)
                .attr('transform',`translate(${orientation === 'left' ? 0 : sizing.width})`)
                .call(primaryCurve.axis())
                .append('text')
                    .attr('class','axis-title')
                    .attr('transform', 'rotate(-90)')
                    .attr('y', '0')
                    .attr('dy',`${orientation === 'left' ? '-' : ''}4em`)
                    .attr('x',-1*(sizing.height/2)) // looks odd but to move in the Y we need to change X because of transform
                    .style('text-anchor', 'middle')
                    .attr('fill','#000')
                    .text(primaryCurve.axisLabel());
        });

        let xTickConfig = X_TICK_CFG[(selection.frequency||selection.defaultFrequency).value];
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

        // if a given metric just has a single curve then color its axis to match
        metricIds.forEach(metricId => {
            const curves:ActivityCurve[] = mapped[metricId].curves;
            if(curves.length === 1) {
                const axis = chart.select(`g.y.axis.${metricId}`);
                ['g.tick text','text.axis-title'].forEach(subSelect => axis.selectAll(subSelect).style('fill',curves[0].color))
            }
        });

        this.commonUpdates();

        // draw the curves
        validCurves.forEach(c => c.draw(chart));

        this.updateLegend();
        this.hover();
    }
}
