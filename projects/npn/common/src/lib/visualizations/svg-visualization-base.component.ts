import { Component, Input } from '@angular/core';

import { VisSelection, VisSelectionEvent } from './vis-selection';
import { VisualizationBaseComponent, VisualizationSizing, VisualizationMargins } from './visualization-base.component';

import { Selection } from 'd3-selection';
import * as d3 from 'd3';

export const DEFAULT_MARGINS: VisualizationMargins = { top: 20, right: 30, bottom: 60, left: 40 };
export const FONT_SIZE: number = 14;
export const FONT_SIZE_PX: string = FONT_SIZE + 'px';

/*
IMPORTANT: see not in VisualizationBaseComponent

@Component({
    selector: 'svg-visualization-base',
    templateUrl: './svg-visualization-base.component.html',
    styleUrls: ['./svg-visualization-base.component.scss']
})
*/
export class SvgVisualizationBaseComponent extends VisualizationBaseComponent {
    record: any;

    disclaimer: string;

    filename: string = 'visualization.png';

    // wrapping element
    visRoot: Selection<any, any, any, any>;
    // svg element
    svg: Selection<any, any, any, any>;
    // base g element that the chart draws on
    chart: Selection<any, any, any, any>;

    margins: VisualizationMargins = DEFAULT_MARGINS;

    protected minWidth: number = 700;

    baseFontSize(withPx?: boolean): number | string {
        let fs = FONT_SIZE;
        /*
        if(this.sizing) {
            if(this.sizing.width < 650) {
                fs -=2;
            }
            if(this.sizing.width < 400) {
                fs -= 2;
            }
        }*/
        return withPx ? `${fs}px` : fs;
    }

    /**
     * sub-classes should call after they have redrawn the visualization to get any
     * common styling updates applied.
     */
    protected commonUpdates(): void {
        let chart = this.chart,
            fontSizePx = this.baseFontSize(true);

        ['.axis path', '.axis line'].forEach(selector =>
            chart.selectAll(selector).style('fill', 'none')
                .style('stroke', '#000')
                .style('shape-rendering', 'crispEdges'));

        chart.selectAll('text')
            .style('font-family', 'Arial');
        chart.selectAll('g .axis text')
            .style('font-size', fontSizePx);
    }

    /**
     * `reset` is intended to initialize a visualziation to it's known "clean" state
     * placing all common elements, etc.  Subclasses will almost certainly over-ride
     * this implementation and call it to get the ball rolling.
     *
     * No asynchronous work should be done here, fetching data, etc. should happen
     * only within `update`.
     */
    protected reset(): void {
        let sizing = this.getSizeInfo(),
            svg = this.svg,
            width = sizing.width + sizing.margin.left + sizing.margin.right,
            height = sizing.height + sizing.margin.top + sizing.margin.bottom;
        // remove all children
        svg.selectAll('*').remove();
        // set size
        svg.attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');
        svg.append('g')
            .attr('class', 'vis-background')
            .append('rect')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('fill', '#fff');
        this.chart = svg.append('g')
            .attr('transform', `translate(${sizing.margin.left},${sizing.margin.top})`)
            .attr('class', 'vis-chart');

        svg.append('g')
            .attr('transform', `translate(10,${sizing.height + sizing.margin.top + sizing.margin.bottom - 10})`)
            .append('text')
            .attr('font-size', '11px')
            .attr('font-style', 'italic')
            .attr('text-anchor', 'right').text('USA National Phenology Network, www.usanpn.org');
    }

    protected resize(): void {
        this.reset();
        this.redraw();
    }

    // this used to be in ngAfterViewInit and most time it would succeed from there
    // but very occasionally ngAfterViewInit would be called BEFORE the underlying
    // elements exist in the DOM.  No time to understand cleanly why so these selections
    // are now made whever asking about sizing which is the FIRST thing necessary to
    // render an SVG visualization so it should be safe.
    private selectElements() {
        this.visRoot = d3.select('#' + this.id);
        this.svg = this.visRoot.select('svg');
    }

    getSizeInfo(minWidth?: number): VisualizationSizing {
        this.selectElements();
        return super.getSizeInfo(this.minWidth);
    }

    /**
     * IMPORTANT:
     * Sub-classes should implement the redrawSvg and not over-ride redraw.
     * If redraw is over-ridden the implementation  will lose the ability to
     * dynamically replace themselves with a thumbnail should the screen
     * realestate for the visualization get too small.
     * 
     * public and not protected because used by HTML templates directly
     */
    redraw(): void {
        this.redrawSvg();
        let sizeInfo = this.sizing,
            w = sizeInfo.width + sizeInfo.margin.left + sizeInfo.margin.right;
        if (w === this.minWidth) {
            // If the resulting width matches the minWidth then the realestate to draw the
            // SVG is at or below the minWidth.  Attempting to render visualizations too small
            // results in unusable/cramped results so when we reach this break point draw the
            // visualization scaled to its minimum size and scale it down (shrink everything)
            let native = this.rootElement.nativeElement as HTMLElement,
                svg = native.querySelector('svg.svg-visualization') as SVGElement,
                wrappedSvg = d3.select(svg),
                h = sizeInfo.height + sizeInfo.margin.bottom + sizeInfo.margin.top,
                aspectMult = sizeInfo.scaledWidth / this.minWidth;
            wrappedSvg.attr('width', sizeInfo.scaledWidth);
            wrappedSvg.attr('height', Math.round(h * aspectMult));
        }
    }

    /**
     * SVG replacement for the redraw function.
     */
    protected redrawSvg(): void { throw new Error('abstract'); }

    ngAfterViewInit() {
        this.selectElements();
        // sets up common handlers
        super.ngAfterViewInit();
    }

}
