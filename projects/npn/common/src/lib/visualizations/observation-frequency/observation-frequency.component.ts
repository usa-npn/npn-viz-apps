import {Component,Input,Output,EventEmitter,OnInit} from '@angular/core';

import {VisualizationMargins} from '../visualization-base.component';
import {SvgVisualizationBaseComponent,DEFAULT_MARGINS,FONT_SIZE,FONT_SIZE_PX} from '../svg-visualization-base.component';

import {ObservationFrequencySelection} from './observation-frequency-selection';

import {Axis,axisBottom,axisLeft} from 'd3-axis';
import {Selection} from 'd3-selection';
import {ScaleBand,scaleBand,ScaleLinear,scaleLinear,ScaleOrdinal,scaleOrdinal} from 'd3-scale';
import * as d3 from 'd3';

const TITLE = 'Site visits by month';

@Component({
  selector: 'observation-frequency',
  // IMPORTANT: this template is a copy of ../svg-visualization-base.component.html so that
  // it can have added controls.  if the former changes this one may need updates too
  templateUrl: './observation-frequency.component.html',
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

    filename:string = 'observation-frequency.png';
    margins: VisualizationMargins = {...DEFAULT_MARGINS, ...{top: 80,left: 80}};

    stations:any[]; // to avoid null check
    _station:any; // the current station being displayed
    data:any;

    set station(s:any) {
        this._station = s;
        if(this.selection.editMode) {
            delete this.selection.defaultStation;
            if(this._station) {
                this.selection.defaultStation = this._station.station_id;
            }
        }
    }

    get station():any {
        return this._station;
    }

    private getMonthFormat(): string {
        if(this.sizing && this.sizing.width < 800) {
            return '%b';
        }
        return '%B';
    }

    protected reset(): void {
        console.debug('ObservationFrequencyComponent.reset');
        super.reset();
        let chart = this.chart,
            sizing = this.sizing,
            d3_month_fmt = d3.timeFormat(this.getMonthFormat()),
            fontSize:number = this.baseFontSize() as number;
        this.title =  chart.append('g')
                     .attr('class','chart-title')
                     .append('text')
                     .attr('y', '0')
                     .attr('dy','-3em')
                     .attr('x', '0')
                     .style('text-anchor','start')
                     .style('font-size','18px');

        this.x = scaleBand<number>()
            .rangeRound([0,sizing.width])
            .padding(0.05)
            .domain(d3.range(0,12));
        this.xAxis = axisBottom<number>(this.x).tickFormat(i =>  d3_month_fmt(new Date(1900,i)));
        chart.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + sizing.height + ')')
            .call(this.xAxis);

        this.y = scaleLinear().range([sizing.height,0]).domain([0,20]); // just a default domain
        this.yAxis = axisLeft<number>(this.y).tickFormat(d3.format('.0d'));
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
        delete this.stations;
        delete this.station;
        this.selection.getData()
            .then(data => {
                this.data = data;
                this.stations = data.stations;
                this.redraw();
            })
            .catch(this.handleError);
    }

    protected redrawSvg(): void {
        console.debug('ObservationFrequencyComponent.redrawSvg:data',this.data);
        if(!this.stations || !this.stations.length) {
            return;
        }
        if(!this.station) {
            if(this.selection.defaultStation) {
                this.station = this.stations.reduce((found,s) => {
                    return found||(s.station_id === this.selection.defaultStation ? s : undefined);
                },undefined);
            }
            if(!this.station) {
                this.station = this.stations[0];
            }
        }
        this.redrawStation();
        this.commonUpdates();
    }

    private redrawStation():void {
        this.title.text(`${TITLE}, "TODO: Refuge Name", ${this.selection.year}`);
        if(!this.station) {
            return;
        }
        let station = this.station;
        console.debug('ObservationFrequencyComponent.redrawStation:station',station);
        if(!station) {
            return;
        }

        let sizing = this.sizing,
            bars:any[] = station.months.slice(),
            total = bars.reduce((sum,d) => sum+d,0),
            max = bars.reduce((max,d) => (d > max ) ? d : max,0);

        this.title.text(`${TITLE} (${this.selection.year}) "${station.station_name}" Total: ${total}`);
        console.debug('ObservationFrequencyComponent.redrawStation:bars',bars);

        // update x axis with months+total
        this.x.domain(d3.range(0,bars.length));
        this.chart.selectAll('g .x.axis').call(this.xAxis);
        // update y axis domain
        this.y.domain([0,max]);
        this.yAxis.ticks(max < 11 ? max : 10); // at most 10 ticks
        this.chart.selectAll('g .y.axis').call(this.yAxis);

        // update bars
        this.chart.selectAll('g .bars').remove();
        this.chart.append('g')
            .attr('class','bars')
            .attr('fill','#98abc5')
            .selectAll('rect')
            .data(bars)
            .enter().append('rect')
            .attr('x',(d,i) => this.x(i))
            .attr('y',d => this.y(d))
            .attr('title', d => d)
            .attr('height', d => sizing.height - this.y(d))
            .attr('width', this.x.bandwidth());

        // update bar labels
        this.chart.selectAll('g .bar-labels').remove();
        this.chart.append('g')
            .attr('class','bar-labels')
            .attr('fill', '#000000')
            .selectAll('text')
            .data(bars)
            .enter().append('text')
                .attr('text-anchor','middle')
                .attr('dy','-0.25em')
                .attr('x',(d,i) => this.x(i)+(this.x.bandwidth()/2))
                .attr('y',d => this.y(d))
                .text(d => d);
    }
}

@Component({
    selector: 'observation-frequency-station-control',
    template:`
    <button class="prev" mat-button (click)="prev()">&lt; Previous</button>
    <mat-form-field class="station-input">
        <mat-select placeholder="Site" [(ngModel)]="station" [disabled]="!stations || !stations.length">
            <mat-option *ngFor="let s of stations" [value]="s">{{s.station_name}}</mat-option>
        </mat-select>
    </mat-form-field>
    <button class="next" mat-button (click)="next()">Next &gt;</button>
    `,
    styleUrls:['./station-control.scss']
})
export class ObvervationFrequencyStationControlComponent {
    @Input() stations:any[];
    @Output() stationChange = new EventEmitter<any>();
    stationValue:any;

    @Output() onStationChange = new EventEmitter<any>();

    @Input('station')
    get station():any {
        return this.stationValue;
    }
    set station(s) {
        if(s !== this.stationValue) {
            let oldValue = this.stationValue;
            this.stationChange.emit(this.stationValue = s);
            this.onStationChange.emit({
                oldValue: oldValue,
                newValue: this.stationValue
            });
        }
    }

    prev() {
        let idx = this.stations.indexOf(this.station);
        if(idx > 0) {
            this.station = this.stations[idx-1];
        } else {
            this.station = this.stations[this.stations.length-1]; // loop around to last station
        }
    }

    next() {
        let idx = this.stations.indexOf(this.station);
        if(idx < this.stations.length-1) {
            this.station = this.stations[idx+1];
        } else {
            this.station = this.stations[0]; // loop around to the first station.
        }
    }
}
