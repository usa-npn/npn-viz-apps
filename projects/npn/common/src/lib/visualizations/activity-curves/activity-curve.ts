import {selectionProperty,GET_EXTERNAL,SET_EXTERNAL} from '../vis-selection';
import {
    TaxonomicSpeciesTitlePipe,
    DoyPipe,
    SpeciesPlot,
    TaxonomicSpeciesType,
    TaxonomicSpeciesRank,
    TaxonomicPhenophaseType,
    TaxonomicPhenophaseRank,
    SpeciesTitlePipe
} from '../../common';
import {ActivityCurvesSelection} from './activity-curves-selection';

import * as d3 from 'd3';

export class ActivityCurve implements SpeciesPlot {
    @selectionProperty()
    id:number;

    interpolate? :INTERPOLATE;

    @selectionProperty()
    speciesRank:TaxonomicSpeciesRank;
    @selectionProperty()
    private _species:TaxonomicSpeciesType;
    @selectionProperty({
        ser: d => d,
        des: d => {
            // when deserializing re-align with the actual metric object
            // so equality checks elsewhere work.
            return !!d
                ? ALL_METRICS.find(m => m.id === d.id)
                : d;
        }
    })
    private _metric;
    @selectionProperty()
    phenophaseRank:TaxonomicPhenophaseRank;
    @selectionProperty()
    private _phenophase:TaxonomicPhenophaseType;
    @selectionProperty()
    private _year:number;

    private _originalMetrics;
    private _metrics;

    @selectionProperty()
    private _color:string;
    orient:string;

    doyFocus:number;
    dataPoints:boolean = true;

    private $data:any;
    private $metricData:any;
    private $x;
    private $y;

    selection:ActivityCurvesSelection;

    get external() { return GET_EXTERNAL.apply(this,arguments); }
    set external(o) { SET_EXTERNAL.apply(this,arguments); }

    private reset() {
        delete this.$data;
        delete this.$metricData;
    }

    private updateCheck(requiresUpdate?:boolean) {
        if(this.selection && this.isValid()) {
            if(!this.plotted() || requiresUpdate) {
                this.selection.update();
            } else {
                this.selection.redraw();
            }
        }
    }

    get year() {
        return this._year;
    }
    set year(y) {
        this.reset();
        this._year = y;
        this.updateCheck(true);
    }

    get phenophase():TaxonomicPhenophaseType {
        return this._phenophase;
    }
    set phenophase(p:TaxonomicPhenophaseType) {
        this.reset();
        this._phenophase = p;
        this.updateCheck(true);
    }

    get color():string {
        return this._color;
    }
    set color(c:string) {
        this._color = c;
        this.updateCheck(false);
    }

    get metric() {
        return this._metric;
    }
    set metric(m) {
        this.reset();
        this._metric = m;
        this.updateCheck();
    }

    get species():TaxonomicSpeciesType {
        return this._species;
    }
    set species(s:TaxonomicSpeciesType) {
        this.reset();
        this._species = s;
        this.phenophase = undefined;
        this._metrics = this._species && this._species.kingdom 
            ? (ACTIVITY_CURVE_KINGDOM_METRICS[this._species.kingdom]||[])
            : [];
        this._originalMetrics = this._metrics;
        if(this._metric && this._metrics.indexOf(this._metric) === -1) {
            // previous metric has become invalid
            delete this.metric;
        }
        if(this._metrics.length && !this._metric) {
            this.metric = this._metrics[0];
        }
    }

    get validMetrics() {
        return (this._metrics||[]);
    }

    /**
     * Puts all valid metrics back if they were overridden
     */
    overrideValidMetricsReset() {
        this._metrics = this._originalMetrics;
    }

    /**
     * Change which metrics are selectable.  This codes does NOT validate
     * the input it should only ever be a subset of the originally valid
     * metrics.
     * 
     * @param valid The new set of valid metrics.
     */
    overrideValidMetrics(valid:any[]) {
        this._metrics = valid;
        if(this._metric && this._metrics.indexOf(this._metric) === -1) {
            // previous metric has become invalid
            delete this._metric;
            if(this.selection) {
                this.selection.redraw();
            }
        }
    }

    /**
     * @return The metric label for the curve axis.
     */
    axisLabel(): string {
        return this.metric ? this.metric.label : '?';
    }

    doyDataValue() {
        let self = this,
            data = self.data(),
            value,d,i;
        if(self.doyFocus && data) {
            for(i = 0; i < data.length; i++) {
                d = data[i];
                if(self.doyFocus >= d.start_doy && self.doyFocus <= d.end_doy) {
                    value = (self.metric.valueFormat||IDENTITY)(d[self.metric.id]);
                    if(d[self.metric.sampleSize] !== -9999) {
                        value += ' N:'+ d[self.metric.sampleSize];
                    }
                    return value;
                }
            }
        }
    }

    /**
     * @return Formatted label for the legend.
     */
    legendLabel(includeMetric:boolean) {
        let doyFocusValue = this.doyDataValue();
        const pp = this.phenophase as any;
        return this.year+': '+SPECIES_TITLE(this.species,this.speciesRank)+' - '+(pp.phenophase_name||pp.pheno_class_name)+
            (includeMetric ? (' ('+this.metric.label+')') : '')+
            (typeof(doyFocusValue) !== 'undefined' ? (' ['+doyFocusValue+']') : '');
    }

    /**
     * @return The metric id.
     */
    metricId() {
        return this.metric? this.metric.id : undefined;
    }

    data(_?):any {
        if(arguments.length) {
            delete this.$data;
            delete this.$metricData;
            if(_) {
                _.forEach(function(d) {
                    d.start_doy = DOY(d.start_date);
                    d.end_doy = DOY(d.end_date);
                });
                _.sort(function(a,b) {
                    return a.start_doy - b.start_doy;
                });
                this.$data = _;
            }
            return this;
        }
        var self = this,
            data = self.$data;
        if(data && self.metric) {
            // avoid re-filtering with UI updates, store the result and re-use until
            // something changes
            if(!self.$metricData) {
                if(!self.metric.sampleSize) {
                    console.warn('Metric does not define a sampleSize property, cannot filter out invalid data points.');
                }
                data = data.filter(function(d){
                    if(self.metric.sampleSize && d[self.metric.sampleSize] === -9999) {
                        //console.log('SAMPLE_SIZE filter.');
                        return false;
                    }
                    return d[self.metric.id] !== -9999;
                });
                if(data.length !== self.$data.length) {
                    console.debug('filtered out '+(self.$data.length-data.length)+'/'+ self.$data.length +' of -9999 records for metric ',self.metric);
                }
                /*
                if(data.length === 26) { // simulate situation for development bi-weekly data
                    //console.log('DEBUG CODE MODIFYING DATA!!');
                    // create a single isolated data point and three separate curves
                    // [0-9] [11] [13-19] [21-25]
                    data = data.filter(function(d,i) {
                        return (i !== 10 && i !== 12 && i !== 20);
                    });
                }*/
                self.$metricData = data;
            } else {
                data = self.$metricData;
            }
        }
        return data;
    }

    axis() {
        var y = this.y(),
            ticks = y.ticks(), // default is ~10 ticks
            orient = this.orient||'left',
            axis = orient === 'left' ? d3.axisLeft(y) : d3.axisRight(y);
        if(ticks.length) {
            // replace the final tick with the top of the y domain
            // that -would- have been generated and use them explicitly
            // this can result in ticks stacked on on another if too close
            //ticks.push(y.domain()[1]);
            // this often results in a larger space between the two topmost ticks
            ticks[ticks.length-1] = y.domain()[1];
            axis.tickValues(ticks);
        }
        return axis;
    }

    x(_?) {
        if(arguments.length) {
            this.$x = _;
            return this;
        }
        return this.$x;
    }

    y(_?) {
        if(arguments.length) {
            this.$y = _;
            return this;
        }
        return this.$y;
    }

    isValid():boolean {
        return !!this.species &&
            !!this.phenophase &&
            !!this.year &&
            !!this.metric;
    }

    plotted(): boolean {
        // not keeping track of a flag but curves are plotted if they
        // are valid and have data
        return this.isValid() && this.data();
    }

    shouldRevisualize():boolean {
        return this.isValid() && !this.data();
    }

    domain() {
        var self = this,
            data = self.data(),
            extents;
        if(data && self.metric) {
            extents = d3.extent(data,function(d){
                return d[self.metric.id];
            });
            if(extents[0] > 0) {
                // typically data sets will contain 0 but really always want the
                // lower extent of any y axis to be zero so make it so
                extents[0] = 0;
            } else if(extents[0] < 0) {
                // this shouldn't happen but don't futz with the domain in this
                // case or the graph would go wonky
                console.warn('negative domain start for metric',extents,self.metric);
            }
            return extents;
        }
    }

    draw(chart) {
        let self = this,
            data = self.data(),
            datas = [[]],
            x,y,i,d,dn,line,
            r = 3;
        chart.selectAll(`g.curve.curve-${self.id}`).remove();
        const g = chart.append('g')
            .attr('class',`curve curve-${self.id}`);
        if(data && data.length) {
            // detect any gaps in the data, break it into multiple curves/points
            // to plot
            for(i = 0; i < data.length; i++) {
                d = data[i];
                dn = (i+1) < data.length ? data[i+1] : undefined;
                datas[datas.length-1].push(d);
                if(dn && dn.start_doy !== (d.end_doy+1)) {
                    datas.push([]); // there's a gap in the data, start another curve or point
                }
            }
            x = self.x();
            y = self.y();
            let x_functor = (d) => x(d.start_doy+Math.round((d.end_doy-d.start_doy)/2)),
                y_functor = (d) => y(d[self.metric.id]);
            line = d3.line();
            switch(self.interpolate) {
                case INTERPOLATE.monotone:
                    line.curve(d3.curveMonotoneX);
                    break;
                case INTERPOLATE.stepAfter:
                    line.curve(d3.curveStepAfter);
                    break;
                case INTERPOLATE.linear:
                    line.curve(d3.curveLinear);
                    break;
            }
            line.x(x_functor);
            line.y(y_functor);
            console.debug('ActivityCurve.draw',self.species,self.phenophase,self.year,self.metric,self.domain(),y.domain());
            console.debug('draw.datas',datas);
            datas.forEach(function(curve_data,i){
                if(curve_data.length === 1 || self.dataPoints) {
                    curve_data.forEach(function(d){
                        g.append('circle')
                            .attr('class','curve-point curve-point-'+self.id)
                            .attr('r',r)
                            .attr('fill',self.color)
                            .attr('cx',x_functor(d))
                            .attr('cy',y_functor(d));
                    });
                }
                if(curve_data.length > 1) {
                    g.append('path')
                        .attr('class','curve curve-'+self.id)
                        .attr('fill','none')
                        .attr('stroke',self.color)
                        .attr('stroke-linejoin','round')
                        .attr('stroke-linecap','round')
                        .attr('stroke-width',1.5)
                        .attr('d',line(curve_data));
                }
            });
        }
    }
}
export enum INTERPOLATE {
    linear,
    stepAfter,
    monotone
};
const DECIMAL = v => v.toFixed(2);
const IDENTITY = o => o;
const SPECIES_TITLE_PIPE = new TaxonomicSpeciesTitlePipe(new SpeciesTitlePipe());
const SPECIES_TITLE = (item: TaxonomicSpeciesType,rank:TaxonomicSpeciesRank) => SPECIES_TITLE_PIPE.transform(item,rank);
const DOY_PIPE = new DoyPipe();
const DOY = (date,ignoreLeapYear?:boolean): any => DOY_PIPE.transform(date,ignoreLeapYear);

const COMMON_METRICS:any[] = [{
            id: 'num_yes_records',
            sampleSize: 'status_records_sample_size',
            label: 'Total Yes Records'
        },{
            id: 'proportion_yes_records',
            sampleSize: 'status_records_sample_size',
            label: 'Proportion Yes Records',
            valueFormat: DECIMAL,
            proportion: true
        }];
export const ACTIVITY_CURVE_KINGDOM_METRICS = {
            Plantae: COMMON_METRICS.concat([{
                id: 'numindividuals_with_yes_record',
                sampleSize: 'individuals_sample_size',
                label: 'Total Individuals with Yes Records'
            },{
                id: 'proportion_individuals_with_yes_record',
                sampleSize: 'individuals_sample_size',
                label: 'Proportion Individuals with Yes Records',
                valueFormat: DECIMAL,
                proportion: true
            }]),
            Animalia: COMMON_METRICS.concat([{
                id: 'numsites_with_yes_record',
                sampleSize: 'sites_sample_size',
                label: 'Total Sites with Yes Records'
            },{
                id: 'proportion_sites_with_yes_record',
                sampleSize: 'sites_sample_size',
                label: 'Proportion Sites with Yes Records',
                valueFormat: DECIMAL,
                proportion: true
            },{
                id: 'total_numanimals_in-phase',
                sampleSize: 'in-phase_site_visits_sample_size',
                label: 'Total Animals In Phase'
            },
            {
                id: 'mean_numanimals_in-phase',
                sampleSize: 'in-phase_per_hr_sites_sample_size',
                label: 'Animals In Phase',
                valueFormat: DECIMAL
            },{
                id: 'mean_numanimals_in-phase_per_hr',
                sampleSize: 'in-phase_per_hr_sites_sample_size',
                label: 'Animals In Phase per Hour',
                valueFormat: DECIMAL
            },{
                id: 'mean_numanimals_in-phase_per_hr_per_acre',
                sampleSize: 'phase_per_hr_per_acre_sites_sample_size',
                label: 'Animals In Phase per Hour per Acre',
                valueFormat: DECIMAL
            }])
        };

const ALL_METRICS = Object.keys(ACTIVITY_CURVE_KINGDOM_METRICS).reduce((arr,key) =>{
    ACTIVITY_CURVE_KINGDOM_METRICS[key]
        .filter(metric => arr.indexOf(metric) === -1)
        .forEach(metric => arr.push(metric));
    return arr;
},[]);