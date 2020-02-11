import { Component, Input, ElementRef, ViewEncapsulation } from '@angular/core';
import { SvgVisualizationBaseComponent } from '../svg-visualization-base.component';
import { AgddTimeSeriesSelection, AgddTimeSeriesData,  DATA_FUNC, TimeSeriesDataPoint, AGDD_COLORS } from './agdd-time-series-selection';
import { VisualizationMargins } from '../visualization-base.component';
import { ObservableMedia } from '@angular/flex-layout';
import { ONE_DAY_MILLIS } from '../vis-selection';

import { Axis, axisBottom, axisLeft } from 'd3-axis';
import { ScaleLinear, scaleLinear } from 'd3-scale';
import * as d3 from 'd3';
import { DecimalPipe } from '@angular/common';

const DEG_F = '\u00B0' + 'F';
const D3_DATE_FMT = d3.timeFormat('%m/%d');
const ROOT_DATE = new Date(2010,0);
const DATE_FMT = (d) => {
    let time = ((d-1)*ONE_DAY_MILLIS)+ROOT_DATE.getTime(),
        date = new Date(time);
    return D3_DATE_FMT(date);
};
@Component({
    selector: 'agdd-time-series',
    templateUrl: '../svg-visualization-base.component.html',
    styleUrls: ['../svg-visualization-base.component.scss']
})
export class AgddTimeSeriesComponent extends SvgVisualizationBaseComponent {
    @Input() selection:AgddTimeSeriesSelection;
    filename:string = 'agdd-time-series.png';
    margins: VisualizationMargins = {top: 80,left: 80,right: 30,bottom: 60};


    x: ScaleLinear<number,number>;
    xAxis: Axis<number>

    y: ScaleLinear<number,number>;
    yAxis: Axis<number>;
    _yMax:number;
    get yMax():number { return this._yMax||20000; }

    _line;
    get line() { return this._line||(() => {}); }

    thresholdLine;

    private _data:AgddTimeSeriesData;
    get data():AgddTimeSeriesData { return this._data||{} };

    constructor(protected rootElement:ElementRef,protected media:ObservableMedia,private decimalPipe:DecimalPipe) {
        super(rootElement,media);
    }

    private removeLines() {
        const {data,chart} = this;
        chart.selectAll('path.gdd').remove();
        Object.keys(data)
            .filter(key => !!data[key])
            .forEach(key => delete data[key].plotted);
        this.updateLegend();
    }

    private addLines() {
        const {data,chart,line} = this;
        Object.keys(data)
            .filter(key => !!data[key])
            .forEach(key => {
                chart.append('path')
                    .attr('class','gdd '+key)
                    .attr('fill','none')
                    .attr('stroke',data[key].color)
                    .attr('stroke-linejoin','round')
                    .attr('stroke-linecap','round')
                    .attr('stroke-width',1.5)
                    .attr('d',line(data[key].filtered||data[key].data));
                data[key].plotted = true;
            });
        this.updateLegend();
    }

    private updateTitle() {
        //console.log('AGDD: updateTitle');
        const {chart,sizing,selection} = this;
        const title = chart.select('.chart-title');
        title.selectAll('*').remove();
        title.append('text')
            .attr('y', '0')
            .attr('dy','-3em')
            .attr('x', (sizing.width/2))
            .style('text-anchor','middle')
            .style('font-size','18px').text('Accumulated Growing Degree Days');
        if(selection.latLng && selection.latLng.length === 2) {
            const [lat,lng] = selection.latLng;
            title.append('text')
            .attr('y', '0')
            .attr('dy','-1.8em')
            .attr('x', (sizing.width/2))
            .style('text-anchor','middle')
            .style('font-size','18px').text(`(Lat: ${lat.toFixed(3)}, Lon: ${lng.toFixed(3)}) ${selection.baseTemp}${DEG_F} Base Temp`);
        }
    }

    private updateAxes() {
        // console.log('AGDD: updateAxes');
        this.removeLines();
        const {data,chart,sizing,y,yAxis,x,xAxis,selection} = this;
        let {yMax} = this;
        const lineKeys = Object.keys(data).filter(key => !!data[key]);
        if(lineKeys.length) {
            // calculate/re-calculate the y-axis domain so that the data fits nicely
            const maxes = lineKeys.reduce((arr,key) => {
                    arr.push(d3.max((data[key].filtered||data[key].data),DATA_FUNC));
                    return arr;
                },[]);
            selection.thresholdCeiling = Math.round(yMax = d3.max(maxes));
            yMax = yMax*1.05;
            const doy = selection.doy;

            // update x/y axis
            yAxis.scale(y.domain([0,yMax]));
            xAxis.scale(x.domain([1,doy]));

            // filter or unfilter the data depending on doy
            Object.keys(data)
                .filter(key => !!data[key])
                .forEach(key => data[key].filtered = doy < 365
                        ? data[key].filtered = data[key].data.filter(d => d.doy <= doy)
                        : undefined);

            this.addLines();
            // update the position of the threshold line
            const yCoord = this.y(selection.threshold);
            this.thresholdLine
                .attr('y1',yCoord).attr('y2',yCoord)
                // hide the threshold line if it's off the axis
                .style('display',selection.threshold > selection.thresholdCeiling ? 'none' : null);
        }
        chart.selectAll('g .axis').remove();
        chart.append('g')
            .attr('class', 'y axis')
            .call(yAxis)
            .append('text')
            .attr('fill','#000')
            .attr('transform', 'rotate(-90)')
            .attr('y', '0')
            .attr('dy','-3.75em')
            .attr('x',-1*(sizing.height/2)) // looks odd but to move in the Y we need to change X because of transform
            .style('text-anchor', 'middle')
            .text('Accumulated Growing Degree Day Units (AGDDs)');

        chart.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + sizing.height + ')')
            .call(xAxis)
            .append('text')
            .attr('fill','#000')
            .attr('y','0')
            .attr('dy','2.5em')
            .attr('x',(sizing.width/2))
            .style('text-anchor', 'middle')
            .text('Date');
        this.commonUpdates();
    }

    private updateLegend(): void {
        //console.log('AGDD: updateLegend');
        const chart = this.chart;
        chart.selectAll('g.legend').remove();
        const legend = chart.append('g')
            .attr('class', 'legend')
            .attr('transform', 'translate(30,-45)') // relative to the chart, not the svg
            .style('font-size', '1em');
        const rect = legend.append('rect')
                .style('fill', 'white')
                .style('stroke', 'black')
                .style('opacity', '0.8')
                .attr('width', 130)
                .attr('height', 60);
        const data = this.data,
            fontSize = 14, r = 5, vpad = 4,
            keys = ['average', 'selected', 'forecast', 'previous']; //Object.keys(data), hard coding to control order
        const plotCnt = keys.reduce((cnt, key) => {
                let row;
                if (data[key] && data[key].plotted && (data[key].filtered || data[key].data).length) {
                    row = legend.append('g')
                        .attr('class', 'legend-item ' + key)
                        .attr('transform', 'translate(10,' + (((cnt + 1) * fontSize) + (cnt * vpad)) + ')');
                    row.append('circle')
                        .attr('r', r)
                        .attr('fill', data[key].color);
                    row.append('text')
                        .style('font-size', fontSize + 'px')
                        .attr('x', (2 * r))
                        .attr('y', (r / 2))
                        .text(data[key].year);
                    cnt++;
                }
                return cnt;
            }, 0);
        rect.style('display',plotCnt === 0 ? 'none' : null);
        if (plotCnt < 3) {
            rect.attr('height', 45);
        } else if (plotCnt > 3) {
            rect.attr('height', 80);
        }
    }

    private hover():void {
        const {svg,sizing,x,y,yMax} = this;
        const self = this;
        const hover = svg.append('g')
            .attr('transform', 'translate(' + sizing.margin.left + ',' + sizing.margin.top + ')')
            .style('display','none');
        const hoverLine = hover.append('line')
                .attr('class','focus')
                .attr('fill','none')
                .attr('stroke','green')
                .attr('stroke-width',1)
                .attr('x1',x(1))
                .attr('y1',y(0))
                .attr('x2',x(1))
                .attr('y2',y(yMax));
        const hoverInfoDy = '1.2em',
            hoverInfoX = 15,
            hoverInfo = hover.append('text')
                .attr('class','gdd-info')
                .attr('font-size',16)
                .attr('y',40),
            doyInfo = hoverInfo.append('tspan').attr('dy','1em').attr('x',hoverInfoX),
            doyLabel = doyInfo.append('tspan').attr('class','gdd-label').text('DOY: '),
            doyValue = doyInfo.append('tspan').attr('class','gdd-value'),
            infoKeys = ['average','previous','selected','forecast'],
            infos = infoKeys.reduce(function(map,key){
                map[key] = hoverInfo.append('tspan').attr('dy',hoverInfoDy).attr('x',hoverInfoX);
                return map;
            },{}),
            infoLabels = infoKeys.reduce(function(map,key){
                map[key] = infos[key]
                    .append('tspan')
                    .attr('class','gdd-label '+key)
                    .style('font-weight','bold')
                    .style('fill',AGDD_COLORS[key]);
                return map;
            },{}),
            infoValues = infoKeys.reduce(function(map,key){
                map[key] = infos[key].append('tspan').attr('class','gdd-value');
                return map;
            },{}),
            infoDiffs = ['previous','forecast','selected'].reduce(function(map,key){
                map[key] = infos[key].append('tspan').attr('class','gdd-diff');
                return map;
            },{});
        function focusOff() {
            hover.style('display','none');
        }
        function focusOn() {
            hover.style('display',null);
        }
        const nuberFmt = n => this.decimalPipe.transform(n,'1.0-0');
        // clear any "focus" values on existing data otherwise focus rings won't
        // show up after resize.
        infoKeys.filter(k => !!this.data[k]).forEach(k => delete this.data[k].focus);
        function updateFocus() {
            let coords = d3.mouse(this),
                data = self.data,
                xCoord = coords[0],
                doy = Math.round(x.invert(xCoord)),
                lineKeys = Object.keys(data).filter(k => !!data[k]),
                temps;
            hoverLine.attr('transform','translate('+xCoord+')');
            temps = lineKeys.reduce(function(map,key) {
                var temp;
                if(data[key].plotted) {
                    // get the value for doy
                    temp = data[key].doyMap[doy];
                    if(typeof(temp) !== 'undefined') {
                        map[key] = {
                            year: data[key].year,
                            gdd: temp
                        };
                        if(!data[key].focus) {
                            // create a focus ring for this line
                            data[key].focus = hover.append('circle')
                                .attr('r',4.5)
                                .attr('fill','none')
                                .attr('stroke','steelblue');
                        }
                        data[key].focus
                            .style('display',null)
                            .attr('transform','translate('+xCoord+','+y(temp)+')');
                    } else if (data[key].focus) {
                        // invalid doy, hide focus ring
                        data[key].focus.style('display','none');
                    }
                }
                return map;
            },{});
            const idFunc = d => d.doy;
            
            //console.debug('temps for doy '+doy,temps);
            doyValue.text(`${doy} (${DATE_FMT(doy)})`);
            Object.keys(infos).forEach(function(key) {
                var temp,diff,avgDoy,diffDoy,text,i;
                if(temps[key]) {
                    infos[key].style('display',null);
                    infoLabels[key].text((temps[key].year||'30-year Average')+': ');
                    temp = temps[key].gdd;
                    infoValues[key].text(nuberFmt(temp)+' GDD');
                    if(infoDiffs[key] && temps.average != null) {
                        diff = temp-temps.average.gdd;
                        text = ' ('+(diff > 0 ? '+' : '')+nuberFmt(diff)+' GDD';
                        // on what day did the current temperature happen
                        for(i = 0; i < data.average.data.length; i++) {
                            if(DATA_FUNC(data.average.data[i]) > temp) {
                                avgDoy = idFunc(data.average.data[i]);
                                break;
                            }
                        }
                        // this can happen when the year being compared
                        // is now hotter than the average has ever been
                        // i.e. late in the year
                        if(avgDoy > 0 && avgDoy < 366) {
                            diffDoy = (avgDoy-doy);
                            text +='/'+(diffDoy > 0 ?'+' : '')+diffDoy+' days';
                        }

                        text += ')';
                        infoDiffs[key]
                        .attr('class','gdd-diff '+(diff > 0 ? 'above' : 'below'))
                        .style('fill',(diff > 0 ? 'red' : 'blue'))
                        .text(text);
                    }
                } else {
                    infos[key].style('display','none');
                }
            });

        }
        svg.append('rect')
            .attr('class','overlay')
            .attr('transform', 'translate(' + sizing.margin.left + ',' + sizing.margin.top + ')')
            .style('fill','none')
            .style('pointer-events','all')
            .attr('x',0)
            .attr('y',0)
            .attr('width',x(365))
            .attr('height',y(0))
            .on('mouseover',focusOn)
            .on('mouseout',focusOff)
            .on('mousemove',updateFocus);
    }

    protected redrawSvg(): void {
        //console.log('AGDD: redrawSvg');
        this.updateAxes();
        this.updateTitle();
    }

    public reset():void {
        //console.log('AGDD: reset');
        super.reset();
        const {chart,sizing,yMax} = this;
        chart.append('g').attr('class','chart-title');
        this.updateTitle();

        this.x = scaleLinear().range([0,sizing.width]).domain([1,365]);
        this.xAxis = axisBottom<number>(this.x).tickFormat(DATE_FMT);

        this.y = scaleLinear().range([sizing.height,0]).domain([0,yMax])
        this.yAxis = axisLeft<number>(this.y);

        const line = d3.line<TimeSeriesDataPoint>();
        line.curve(d3.curveLinear);
        line.x(d => this.x(d.doy));
        line.y(d => typeof(d.agdd) === 'number' ? this.y(d.agdd) : this.y(d.point_value));
        this._line = line;

        this.thresholdLine = chart.append('line')
            .attr('class','threshold')
            .attr('fill','none')
            .attr('stroke','green')
            .attr('stroke-width',1)
            .attr('x1',this.x(1))
            .attr('y1',this.y(this.yMax))
            .attr('x2',this.x(365))
            .attr('y2',this.y(yMax))
            .style('display','none');
        
        this.hover();
        this.updateAxes();
        this.commonUpdates();
    }

    protected update():void {
        //console.log('AGDD: update');
        this._data = undefined;
        this.reset(); // would like to be able to avoid but
        this.selection.data()
            .then(d => this._data = d)
            .then(() => {
                this.reset();
                this.redraw();
            });
    }
}