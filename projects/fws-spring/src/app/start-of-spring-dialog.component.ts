import { Component, Inject, ElementRef, NgZone, PipeTransform, Pipe } from "@angular/core";
import { Refuge } from "./refuge.service";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material";

import { FLYWAY_TEXTS } from './flyways';
import { FLI_DESCRIPTIONS, FLI_PCNT_BUCKET_INDEX } from './fli-pcnt';

import * as d3 from 'd3';
import { NpnServiceUtils } from '@npn/common';

@Pipe({name:'SosDoy'})
export class SosDoyTransform implements PipeTransform {
    readonly dateFormat = d3.timeFormat('%B %e');
    transform(value:number,stdev:number):string {
        const fixed = value.toFixed(2);
        const fixedStdev = stdev.toFixed(2);
        const fmt = this.dateFormat(this.getDate(value));
        return `${fmt} (${fixed} DOY \u00B1 ${fixedStdev} days)`;
    }

    getDate(value:number):Date {
        const rounded = Math.floor(value);
        const d = new Date(2010,0,1); // 2010 not a leap year
        d.setTime(d.getTime()+((rounded-1)*24*60*60*1000));
        return d;
    }
}

@Component({
    template: `
    <button mat-icon-button class="dialog-close" (click)="close()"><i class="fa fa-times" aria-hidden="true"></i></button>
    <div class="mat-typography" id="startOfSpringDialogWrapper">
        <span class="mat-title">{{refuge.title}}</span>
        <span *ngIf="!noData; else noDataDisclaimer">
            <ul class="refuge-info">
                <li>
                    <label>Average spring leaf onset in recent decades (1983-2012):</label>
                    {{refugeData['FLI (Day)'] | SosDoy:refugeData['FLI SD, AVG']}}
                </li>
                <li>
                    <label>Recent change in timing relative to historical range of variation (1901-2012):</label>
                    Spring first leaf arrival in recent decades is {{fliCategory}} ({{refugeData['FLI (%)'] | number:'1.2-2'}}%) compared to the historical range.
                </li>
                <li>
                    <label>Change in timing over latitudinal exent of migratory flyway (1920-2012):</label>
                    <p>
                        <span *ngIf="FLYWAY_TEXTS[refuge.flywayId]; else noFlyway">
                        {{FLYWAY_TEXTS[refuge.flywayId]}}
                        </span>
                        <ng-template #noFlyway>
                        This Refuge is outside of the four migratory flyways.
                        </ng-template>
                    </p>
                </li>
            </ul>
            <div id="startOfSpringVisWrapper">
                <div class="vis-working" *ngIf="working">
                    <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
                </div>
                <svg id="timeSeries"></svg>
            </div>
        </span>
        <ng-template #noDataDisclaimer>
            <p>Data are not available for this Refuge.</p>
        </ng-template>
    </div>
    <!--pre>{{refugeData | json}}</pre-->
    `,
    styles:[`
        button.dialog-close {
            float: right;
        }
        #startOfSpringVisWrapper {
            min-height: 1px;
            position: relative;
            padding-top: 10px;
        }
        svg {
            display: block;
            border: 1px solid #aaa;
            margin: auto;
        }
        ul.refuge-info {
            margin: 0 0 12px;
        }
        ul.refuge-info>li {
            list-style: none;
            padding: 10px 0px 0px 0px;
        }
        ul.refuge-info>li label {
            font-weight: bold;
        }
        p {
            margin: 0px;
        }
    `],
    providers: [
        SosDoyTransform
    ]
})
export class StartOfSpringDialog {
    working = true;
    FLYWAY_TEXTS = FLYWAY_TEXTS;
    refuge:Refuge;
    refugeData:any;
    noData:boolean;
    fliCategory:string;

    constructor(@Inject(MAT_DIALOG_DATA) private dialogData:any,
                private dialogRef:MatDialogRef<StartOfSpringDialog>,
                private zone:NgZone,
                private npnSvcUtils:NpnServiceUtils,
                private rootElement:ElementRef,
                private doyTrans:SosDoyTransform) {
        this.refuge = dialogData.refuge;
        this.refugeData = dialogData.refugeData;
        const bucketIndex = FLI_PCNT_BUCKET_INDEX(this.refugeData['FLI (%)']);
        this.noData = bucketIndex === -1;
        if(bucketIndex !== -1) {
            this.fliCategory = FLI_DESCRIPTIONS[bucketIndex];
        }
    }

    /*
    this feels like a hack/workaround.  something about the code in this dialog
    prevents the standard mat-dialog-close directive from working, clicks of the
    close icon are being run outside of the angular zone even though (click) events
    are being tied to the correct code.

    the behavior is inconsistent.  everything works on a new window until a browser refresh
    and then stops working.  once it stops working the dialog will close if you click the X
    and then hover the mouse over the visualization (meaning the d3 mouse events ARE being
    evaluated within the angular zone).

    at any rate cannot deep end on the issue and forcing the close to run in the angular
    zone seems to work.
    */
    close() {
        this.zone.run(() => {
            this.dialogRef.close();
        });
    }

    ngAfterViewInit() {
        if(this.noData) {
            return;
        }
        const svg = d3.select('#timeSeries');
        const native = this.rootElement.nativeElement as HTMLElement;
        const wrapper = native.querySelector('#startOfSpringVisWrapper');
        const style = getComputedStyle(wrapper,null);
        const strToPx = s => parseInt(s.replace(/px$/,''));
        const ratioMult = 0.5376 // based on 930/500
        const minusLeft = strToPx(style.paddingLeft)+strToPx(style.borderLeftWidth),
              minusRight = strToPx(style.paddingRight)+strToPx(style.borderRightWidth),
              innerWidth = (wrapper.clientWidth*0.6) - minusLeft - minusRight,
              cw = Math.floor(innerWidth);
        const margin = {top: 35, right: 20, left: 55, bottom: 50};
        const ch = (cw*ratioMult),
              w = cw  - margin.left - margin.right,
              h = ch  - margin.top - margin.bottom;

        const svgWidth = w + margin.left + margin.right,
              svgHeight = h + margin.top + margin.bottom;
        svg.attr('width', svgWidth)
            .attr('height', svgHeight)
            .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
            .attr('preserveAspectRatio','xMidYMid meet');
        svg.append('g')
            .attr('class','vis-background')
            .append('rect')
            .attr('width','100%')
            .attr('height','100%')
            .attr('fill','#fff');
        const chart = svg.append('g')
            .attr('transform',`translate(${margin.left},${margin.top})`)
            .attr('class','vis-chart');

        const hover = svg.append('g')
            .attr('transform',`translate(${margin.left},${margin.top})`)
            .style('display','none');
        const hoverLine = hover.append('line')
            .attr('class','focus')
            .attr('fill','none')
            .attr('stroke','green')
            .attr('stroke-width',1)
            .attr('x1',0)
            .attr('y1',0)
            .attr('x2',0)
            .attr('y2',h);
        const hoverDoy = hover.append('text')
            .attr('class','focus-doy')
            .style('white-space','pre')
            .attr('y',10)
            .attr('x',0)
            .text(' ');

        const startYear = 1981,
              endYear = 2012; // BEST data set only throu 2013 (new Date()).getFullYear() - 2;
        
        svg.append('g')
            .attr('transform',`translate(10,20)`)
            .append('text')
            .attr('font-size', '18px')
            .attr('font-style','bold')
            .attr('text-anchor','left')
            .text(`Arrival of Spring First Leaf Index from ${startYear}-${endYear}`);

        svg.append('g')
            .attr('transform',`translate(10,${h+margin.top+margin.bottom-10})`)
            .append('text')
			.attr('font-size', '11px')
			.attr('font-style','italic')
            .attr('text-anchor','right').text('USA National Phenology Network, www.usanpn.org');

        const x = d3.scaleTime().rangeRound([0,w]);
        const y = d3.scaleLinear().rangeRound([h,0]);
        const parseDate = d3.timeParse('%Y-%m-%d');
        const line = d3.line()
            .x((d:any) => x(d.date))
            .y((d:any) => y(d.doy));

        this.npnSvcUtils.cachedGet(this.npnSvcUtils.dataApiUrl('/v0/si-x/area/statistics/timeseries'),{
            layerName: 'si-x:average_leaf_best',
            fwsBoundary: this.refuge.boundary_id,
            yearStart: startYear,
            yearEnd: endYear,
            useBufferedBoundary: true,
            useConvexHullBoundary: false,
            useCache: false
        }).then(response => {
            this.working = false;
            const data = response.timeSeries;
            (data||[]).forEach(d => {
                d.date = parseDate(d.date);
                d.doy = Math.round(d.mean);
            });

            x.domain(d3.extent(data,function(d:any) { return d.date; }) as [Date,Date]);
            y.domain(d3.extent(data,function(d:any) { return d.doy; }) as [Number,Number]);

            chart.append("g")
                    .attr("transform", "translate(0," + h + ")")
                    .call(d3.axisBottom(x))
                .select(".domain")
                    .remove();
      
            const abbrevDateFmt = d3.timeFormat('%b %e');
            const yTickFmt = (d:number) => abbrevDateFmt(this.doyTrans.getDate(d));
            chart.append("g")
                    .call(d3.axisLeft(y).tickFormat(yTickFmt))
                .append("text")
                    .attr("fill", "#000")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 6)
                    .attr("dy", "0.71em")
                    .attr("text-anchor", "end")
                    .text("Date");

            chart.append("path")
                .datum(data)
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round")
                .attr("stroke-width", 1.5)
                .attr("d", line);

            chart.selectAll('.dot')   
                .data(data)
                .enter().append('circle')
                    .attr('class','dot')
                    .attr('r',3.5)
                    .attr('cx',(d:any) => x(d.date))
                    .attr('cy',(d:any) => y(d.doy))
                    .style('fill','#000');

            const dateFormat = d3.timeFormat('%Y');
            
            function updateFocus() {
                const coords = d3.mouse(this),
                    xCoord = coords[0];
                const inverted:Date = x.invert(xCoord);
                const calcDiff = (d:Date) => Math.abs(inverted.getTime()-d.getTime());
                // find the nearest data point to inverted to "snap to"
                const nearest = data.reduce((nearest,d,index) => {
                    const diff = calcDiff(d.date);
                    if(!nearest || diff < nearest.diff) {
                        return {
                            diff: diff,
                            date: d.date,
                            doy: d.doy,
                            index: index
                        };
                    }
                    return nearest;
                },undefined);
                const tx = x(nearest.date);
                hoverLine.attr('transform',`translate(${tx})`);
                const anchor = nearest.index < (data.length/2) ? 'start' : 'end';
                const doyDate = yTickFmt(nearest.doy);
                hoverDoy
                    .style('text-anchor',anchor)
                    .attr('x',tx)
                    .text(`    ${dateFormat(nearest.date)} (${doyDate})     `);
            }
            svg.append('rect')
                .attr('class','overlay')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
                .style('fill','none')
                .style('pointer-events','all')
                .attr('x',0)
                .attr('y',0)
                .attr('width',w)
                .attr('height',h)
                .on('mouseover',() => hover.style('display',null))
                .on('mouseout',() => hover.style('display','none'))
                .on('mousemove',updateFocus);
        });
    }
}