import { Component, Input, ElementRef } from '@angular/core';

import { ObservableMedia } from "@angular/flex-layout";

import { TaxonomicSpeciesTitlePipe, getSpeciesPlotKeys } from '../../common';
import { VisualizationMargins } from '../visualization-base.component';
import { SvgVisualizationBaseComponent, DEFAULT_MARGINS } from '../svg-visualization-base.component';

import { ScatterPlotSelection } from './scatter-plot-selection';

import { Axis, axisBottom, axisLeft } from 'd3-axis';
import { Selection } from 'd3-selection';
import { ScaleLinear, scaleLinear } from 'd3-scale';
import * as d3 from 'd3';
import { SiteOrSummaryPlotData } from '../site-or-summary-vis-selection';

const DEFAULT_TOP_MARGIN = 80;
const LEGEND_VPAD = 4;
const MARGIN_VPAD = 5;

@Component({
  selector: 'scatter-plot',
  templateUrl: '../svg-visualization-base.component.html',
  styleUrls: ['../svg-visualization-base.component.scss'],
  /*styles: [` // really because of the "inline styles" there's no big need to categorize things...
      .visualization.ScatterPlotComponent {
              border: 1px solid red;
      }
  `]*/
})
export class ScatterPlotComponent extends SvgVisualizationBaseComponent {
    @Input() selection : ScatterPlotSelection;

    title: Selection<any,any,any,any>;

    x: ScaleLinear<number,number>;
    xAxis: Axis<number>;

    y: ScaleLinear<number,number>;
    yAxis: Axis<number>;

    defaultAxisFormat = d3.format('d');
    dateFormat = d3.timeFormat('%x');

    filename:string = 'scatter-plot.png';
    // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-1.html#object-spread-and-rest
    // similar to _|angular.extend
    margins: VisualizationMargins = {...DEFAULT_MARGINS, ...{top: DEFAULT_TOP_MARGIN,left: 60}};

    private data:SiteOrSummaryPlotData[];

    constructor(protected rootElement: ElementRef, protected media:ObservableMedia, protected speciesTitle: TaxonomicSpeciesTitlePipe) {
        super(rootElement,media);
    }

    protected reset(): void {
        this.margins.top = DEFAULT_TOP_MARGIN;
        const fontSize = this.baseFontSize() as number;
        const plotCount = this.data ? this.data.length : 0;
        if(plotCount) {
            this.margins.top = ((plotCount+1)*fontSize)+(plotCount*LEGEND_VPAD)+MARGIN_VPAD;
        }
        super.reset();
        const {chart,sizing} = this;
        const titleFontSize = 18;
        const titleDy = this.margins.top-titleFontSize-fontSize;
        this.title =  chart.append('g')
                     .attr('class','chart-title')
                     .append('text')
                     .attr('y', '0')
                     .attr('dy',`-${titleDy}`)
                     .attr('x', '-2.5em')
                     .style('text-anchor','start')
                     .style('font-size',`${titleFontSize}px`);
        this.x = scaleLinear().range([0,sizing.width]).domain([0,100]);
        this.xAxis = axisBottom<number>(this.x).tickFormat((i) => this.defaultAxisFormat(i));
        this.y = scaleLinear().range([sizing.height,0]).domain([1,365]);
        this.yAxis = axisLeft<number>(this.y);

        chart.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + sizing.height + ')')
            .call(this.xAxis);

        chart.append('g')
            .attr('class', 'y axis')
            .call(this.yAxis)
          .append('text')
          .attr('fill','#000') // somehow parent g has fill="none"
          .attr('transform', 'rotate(-90)')
          .attr('y', '0')
          .attr('dy','-3em')
          .attr('x',-1*(sizing.height/2)) // looks odd but to move in the Y we need to change X because of transform
          .style('text-anchor', 'middle')
          .text('Onset Day of Year');

        this.commonUpdates();
    }

    protected update(): void {
        this.reset();
        this.selection.getData().then((data) => {
            this.data = data;
            this.redraw();
        })
        .catch(e => this.handleError(e));
    }

    protected redrawSvg():void {
        if(!this.data) {
            return;
        }
        let processedData = this.selection.postProcessData(this.data),
            padding = 1,
            selection = this.selection,
            nonNullData = selection.axisNonNull(processedData),
            getX = d => selection.axisData(d),
            getY = d => selection.getDoy(d), // dataFunc
            extent = d3.extent(nonNullData,getX),
            formatXTickLabels = selection.axis.axisFmt||this.defaultAxisFormat;

        this.title.text(`${selection.start} - ${selection.actualEnd}`);

        this.x.domain([extent[0]-padding,extent[1]+padding]);
        this.xAxis.scale(this.x).tickFormat(d3.format('.2f')); // TODO per-selection tick formatting
        let xA = this.chart.selectAll('g .x.axis');
        xA.call(this.xAxis.tickFormat(formatXTickLabels));
        xA.selectAll('.axis-label').remove();
        xA.append('text')
          .attr('class','axis-label')
          .attr('x',(this.sizing.width/2))
          .attr('dy', '3em')
          .attr('fill','#000')
          .style('text-anchor', 'middle')
          .style('font-size', '12px')
          .text(this.selection.axis.label);

        this.y.domain([this.selection.minDoy||1,this.selection.maxDoy||365]);
        this.chart.selectAll('g .y.axis').call(this.yAxis);

        this.chart.selectAll('.circle').remove();
        let circles = this.chart.selectAll('.circle').data(nonNullData,(d:any) => d.id)
            .enter().append('circle')
            .attr('class', 'circle')
            .style('stroke','#333')
            .style('stroke-width','1');

        circles.attr('cx', d => this.x(getX(d)))
              .attr('cy', d => this.y(getY(d)))
              .attr('r', '5')
              .attr('fill',d => d.color)
              .on('click',d => {
                    if (d3.event.defaultPrevented){
                        return;
                    }
                    this.record = d;
                })
              .append('title')
              .text(d => `${selection.doyDateFormat(d.day_in_range)} [${d.latitude},${d.longitude}]`);

        this.chart.selectAll('.regression').remove();
        const plots = this.data.map(d => d.plot);
        plots.forEach(plot => delete plot.regressionLine);
        if(this.selection.regressionLines) {
            let regressionLines = [];
            plots.forEach(plot => {
                let series = nonNullData.filter(d => d.color === plot.color);
                if(series.length) {
                    const keys = getSpeciesPlotKeys(plot);
                    regressionLines.push(plot.regressionLine = new RegressionLine(
                        `${plot.species[keys.speciesIdKey]}.${plot.phenophase[keys.phenophaseIdKey]}`,
                        plot.color,
                        series,
                        getX, getY
                    ));
                }
            });
            let regression = this.chart.selectAll('.regression')
                .data(regressionLines,(d:any) => d.id)
                .enter().append('line')
                .attr('class','regression');
            regression
                //.attr('data-legend',function(d) { return d.legend; } )
                .attr('x1', d => this.x(d.p1[0]))
                .attr('y1', d => this.y(d.p1[1]))
                .attr('x2', d => this.x(d.p2[0]))
                .attr('y2', d => this.y(d.p2[1]))
                .attr('fill', d => d.color)
                .attr('stroke', d => d.color)
                .attr('stroke-width', 2);
        }

        this.chart.select('.legend').remove();
        let legend = this.chart.append('g')
            .attr('class','legend')
            .attr('transform','translate(75,-'+(this.sizing.margin.top-10)+')')
            .style('font-size','1em');
        const r = 5;
        this.data.forEach((d,i) => {
            const plot = d.plot;
            const group = d.group;
            let row = legend.append('g')
                .attr('class','legend-item')
                .attr('transform','translate(10,'+(((i+1)*(this.baseFontSize() as number))+(i*LEGEND_VPAD))+')');
            const pp:any = plot.phenophase;
            let title =  this.speciesTitle.transform(plot.species,plot.speciesRank)+'/'+(pp.phenophase_name||pp.pheno_class_name);
            if(plot.regressionLine && typeof(plot.regressionLine.r2) === 'number' && !isNaN(plot.regressionLine.r2)) {
                // NOTE: the baseline-shift doesn't appear to work on Firefox
                if(this.isIE) {
                    title += ` (R2 ${plot.regressionLine.r2.toFixed(2)})`;
                } else {
                    title += ` (R<tspan style="baseline-shift: super; font-size: 0.65em;">2</tspan> ${plot.regressionLine.r2.toFixed(2)})`;
                }
            }
            if(group) {
                title += ` (${group.label})`;
            }
            row.append('circle')
                .attr('r',r)
                .attr('fill',plot.color);
            let text = row.append('text')
                .style('font-size',this.baseFontSize(true))
                .attr('x',(2*4))
                .attr('y',(r/2));
            if(this.isIE) {
                text.text(title);
            } else {
                text.html(title);
            }
        });

        this.commonUpdates();
    }
}

class RegressionLine {
    id: string;
    color: string;
    legend: string; // TODO
    p1: number[];
    p2: number[];
    r2: number;

    constructor(id: string, color: string, data: any[], getX, getY) {
        let datas = data.sort(function(o1,o2){ // sorting isn't necessary but makes it easy to pick min/max x
                return getX(o1) - getX(o2);
            }),
            isNumber = d => typeof(d) === 'number',
            xSeries = datas.map(getX).filter(isNumber),
            ySeries = datas.map(getY).filter(isNumber),
            leastSquaresCoeff = this.leastSquares(xSeries,ySeries),
            x1 = xSeries[0] as number,
            y1 = this.approxY(leastSquaresCoeff,x1),
            x2 = xSeries[xSeries.length-1] as number,
            y2 = this.approxY(leastSquaresCoeff,x2);

        this.id = id;
        this.color = color;
        this.p1 = [x1,y1];
        this.p2 = [x2,y2];
        this.r2 = leastSquaresCoeff[2];
    }

    leastSquares(xSeries,ySeries): [number,number,number] {
        if(xSeries.length === 0 || ySeries.length === 0) {
            return [Number.NaN,Number.NaN,Number.NaN];
        }
        let reduceSumFunc = function(prev, cur) { return prev + cur; };

        let xBar = xSeries.reduce(reduceSumFunc) * 1.0 / xSeries.length;
        let yBar = ySeries.reduce(reduceSumFunc) * 1.0 / ySeries.length;

        let ssXX = xSeries.map(function(d) { return Math.pow(d - xBar, 2); })
            .reduce(reduceSumFunc);

        let ssYY = ySeries.map(function(d) { return Math.pow(d - yBar, 2); })
            .reduce(reduceSumFunc);

        let ssXY = xSeries.map(function(d, i) { return (d - xBar) * (ySeries[i] - yBar); })
            .reduce(reduceSumFunc);

        let slope = ssXY / ssXX;
        let intercept = yBar - (xBar * slope);
        let rSquare = Math.pow(ssXY, 2) / (ssXX * ssYY);

        return [slope, intercept, rSquare];
    }

    approxY(leastSquaresCoeff,x): number {
        // y = a + bx
        let a = leastSquaresCoeff[1],
            b = leastSquaresCoeff[0];
        return a + (b*x);
    }
}
