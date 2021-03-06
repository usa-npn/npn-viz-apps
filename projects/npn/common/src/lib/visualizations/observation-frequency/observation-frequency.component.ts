import { Component, Input, ElementRef } from '@angular/core';
import { ObservableMedia } from "@angular/flex-layout";

import { VisualizationMargins } from '../visualization-base.component';
import { SvgVisualizationBaseComponent, DEFAULT_MARGINS } from '../svg-visualization-base.component';

import { ObservationFrequencySelection, ObservationFrequencyData } from './observation-frequency-selection';

import { Axis, axisBottom, axisLeft } from 'd3-axis';
import { Selection } from 'd3-selection';
import { ScaleBand, scaleBand, ScaleLinear, scaleLinear, ScaleOrdinal, scaleOrdinal } from 'd3-scale';
import * as d3 from 'd3';
import { getStaticColor } from '../../common';

const TITLE = 'Site visits by month';
const DEFAULT_TOP_MARGIN = 100;
const LEGEND_VPAD = 4;
const MARGIN_VPAD = 5;
const TITLE_FONT_SIZE = 18;
const SWATCH_SIZE = 20;
const BAR_OPACITY = '0.75';

@Component({
  selector: 'observation-frequency',
  templateUrl: '../svg-visualization-base.component.html',
  styleUrls: ['../svg-visualization-base.component.scss'],
})
export class ObservationFrequencyComponent extends SvgVisualizationBaseComponent {
    @Input()
    selection:ObservationFrequencySelection;

    title: Selection<any,any,any,any>;

    x: ScaleBand<number>;
    xAxis: Axis<number>;

    y: ScaleLinear<number,number>;
    yAxis: Axis<number>;

    z: ScaleOrdinal<number,string> = scaleOrdinal<number,string>();

    filename:string = 'observation-frequency.png';
    margins: VisualizationMargins = {...DEFAULT_MARGINS, ...{top: DEFAULT_TOP_MARGIN,left: 80}};

    data:ObservationFrequencyData[];

    constructor(protected rootElement: ElementRef, protected media: ObservableMedia) {
        super(rootElement,media);
    }

    protected reset(): void {
        // dynamic top margins
        this.margins.top = DEFAULT_TOP_MARGIN;
        const fontSize:number = this.baseFontSize() as number;
        const plotCount = this.data ? this.data.length : 0;
        if(plotCount) {
            this.margins.top = fontSize+(plotCount*SWATCH_SIZE)+(plotCount*LEGEND_VPAD)+MARGIN_VPAD;
        }
        super.reset();
        const {chart,sizing,svg} = this;
        const d3_month_fmt = d3.timeFormat('%B');
        const titleDy = this.margins.top-TITLE_FONT_SIZE-fontSize;

        this.title =  chart.append('g')
                     .attr('class','chart-title')
                     .append('text')
                     .attr('y', '0')
                     .attr('dy',`-${titleDy}`)
                     .attr('x', '0')
                     .style('text-anchor','start')
                     .style('font-size',`${TITLE_FONT_SIZE}px`);

        this.x = scaleBand<number>().rangeRound([0,sizing.width]).padding(0.05).domain(d3.range(0,12));
        this.xAxis = axisBottom<number>(this.x).tickFormat(i =>  d3_month_fmt(new Date(1900,i)));
        this.y = scaleLinear().range([sizing.height,0]).domain([0,20]); // just a default domain
        this.yAxis = axisLeft<number>(this.y).tickSize(-sizing.width).tickFormat(d3.format('.0d'));

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
                .text('Site visits');

        this.commonUpdates();
    }

    protected update(): void {
        console.debug('ObservationFrequencyComponent.update');
        this.reset();
        delete this.data;
        this.selection.getData()
            .then(data => {
                this.data = data;
                this.reset()
                this.redraw();
            })
            .catch(this.handleError);
    }

    private updateLegend():void {
        const {chart,data,sizing,z} = this;
        chart.select('.legend').remove();
        if(data && data.length) {
            const fontSize:number = this.baseFontSize() as number;
            z.domain(data.map((d,i) => i)).range(data.map((d,i) => getStaticColor(i)));
            const labels = data.map(d => d.label);
            const legend = chart.append('g')
                .attr('class','legend')
                .attr('transform',`translate(55,-${sizing.margin.top})`)
                .attr('text-anchor','start')
                .style('font-size',`${fontSize}px`)
                .selectAll('g')
                .data(labels)
                    .enter().append('g')
                    // needs to be kept in sync with logic in dynamic margins in reset()
                    .attr('transform',(d,i) => `translate(10,${fontSize+(i*SWATCH_SIZE)+(i*LEGEND_VPAD)})`);
            // add legend swatches
            legend.append('rect')
                .attr('x',0)
                .attr('width',SWATCH_SIZE)
                .attr('height',SWATCH_SIZE)
                .attr('fill',(d,i) => z(i))
                .style('opacity',BAR_OPACITY);
            // add labels
            legend.append('text')
                .attr('x',SWATCH_SIZE+4)
                .attr('y',fontSize)
                .attr('dy','0.1em')
                .text(d => d);
        }
    }

    protected commonUpdates(): void {
        super.commonUpdates();
        const {chart} = this;
        // undo/change some of the commonUpdates
        const _yAxis = chart.select('.y.axis');
        _yAxis.select('path.domain')
            .attr('stroke','none')
            .style('stroke','none');
        _yAxis.selectAll('.tick>line')
            .attr('stroke',i => i === 0 ? '#000' : '#ddd')
            .style('stroke',i => i === 0 ? '#000' : '#ddd');
    }

    protected redrawSvg(): void {
        if(!this.data) {
            return;
        }
        console.debug('ObservationFrequencyComponent.redrawSvg:data',this.data);
        this.title.text(`${this.selection.actualYear}`);
        this.updateLegend();
        const visData = d3.range(0,12)
            .map(month => this.data.reduce((map,d,index) => {
                map[`${index}`] = d.months[month];
                return map;
            },{}));
        const max:number = visData.reduce((max:number,d) => {
                const sum = Object.values(d).reduce((sum:number,n:number) => (sum+n),0);
                return sum > max ? sum : max;
            },0) as number; // TS handing of reduce is stupid
        const layers = d3.stack().keys(this.data.map((d,i) => `${i}`))(visData);
        const {chart,y,yAxis,x} = this;

        y.domain([0,max]);
        yAxis.ticks(max < 11 ? max : 10); // at most 10 ticks
        chart.selectAll('g .y.axis').call(this.yAxis);

        chart.selectAll('.layer').remove();
        const layer = chart.selectAll('.layer')
            .data(layers)
            .enter()
            .append('g')
            .attr('class','layer')
            .style('fill',(d,i) => this.z(i));
        layer.selectAll('rect')
            .data(d => d)
            .enter()
            .append('rect')
                .attr('x',(d,i) => x(i))
                .attr('y',d => y(d[1]))
                .attr('height',d => y(d[0]) - y(d[1]))
                .attr('width',x.bandwidth() -10)
                .style('opacity',BAR_OPACITY);
        this.commonUpdates();
    }
}