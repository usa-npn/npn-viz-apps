import { NULL_DATA, ONE_DAY_MILLIS, selectionProperty, POPInput, BASE_POP_INPUT } from '../vis-selection';
import { SiteOrSummaryVisSelection } from '../site-or-summary-vis-selection';
import { HttpParams } from '@angular/common/http';
import { Species, Phenophase, APPLICATION_SETTINGS } from '../../common';
import * as d3 from 'd3';

const KEYS_TO_NORMALIZE  = {
    daylength: 'mean_daylength',
    acc_prcp: 'mean_accum_prcp',
    gdd: 'mean_gdd'
};

export const AXIS = [
    {key: 'latitude', label: 'Latitude', axisFmt: d3.format('.2f')},
    {key: 'longitude', label: 'Longitude', axisFmt: d3.format('.2f')},
    {key:'elevation_in_meters',label:'Elevation (m)'},
    {key:'fyy', label: 'Year'},

    {key:'prcp_fall',label:'Precip Fall (mm)'},
    {key:'prcp_spring',label:'Precip Spring (mm)'},
    {key:'prcp_summer',label:'Precip Summer (mm)'},
    {key:'prcp_winter',label:'Precip Winter (mm)'},

    {key:'tmax_fall',label:'Tmax Fall (C\xB0)'},
    {key:'tmax_spring',label:'Tmax Spring (C\xB0)'},
    {key:'tmax_summer',label:'Tmax Summer (C\xB0)'},
    {key:'tmax_winter',label:'Tmax Winter (C\xB0)'},

    {key:'tmin_fall',label:'Tmin Fall (C\xB0)'},
    {key:'tmin_spring',label:'Tmin Spring (C\xB0)'},
    {key:'tmin_summer',label:'Tmin Summer (C\xB0)'},
    {key:'tmin_winter',label:'Tmin Winter (C\xB0)'},

    {key:'daylength',label:'Day Length (s)'},
    {key:'acc_prcp',label:'Accumulated Precip (mm)'},
    {key:'gdd',label:'AGDD'}
];

/**
 * @dynamic
 */
export class ScatterPlotSelection extends SiteOrSummaryVisSelection {
    $supportsPop:boolean = true;

    @selectionProperty()
    $class:string = 'ScatterPlotSelection';

    @selectionProperty()
    start: number = 2010;
    @selectionProperty()
    end: number = (new Date()).getFullYear();
    @selectionProperty()
    regressionLines: boolean = false;
    @selectionProperty()
    _axis:any = AXIS[0];
    @selectionProperty()
    _minDoy:number = 1;
    @selectionProperty()
    _maxDoy:number = 365;

    private d3DateFormat = d3.timeFormat('%x');

    get minDoy():number { return this._minDoy; }
    set minDoy(doy:number) {
        this._minDoy = doy;
        this.redraw();
    }

    get maxDoy():number { return this._maxDoy; }
    set maxDoy(doy:number) {
        this._maxDoy = doy;
        this.redraw();
    }

    set axis(a:any) {
        if(a) {
            // an axis may hold axisFmt and if this selection is 
            // deserialized then it won't be in that array
            this._axis = AXIS.indexOf(a) !== -1
                ? a
                : AXIS.find(ax => a.key === ax.key);
        } else {
            this._axis = a;
        }
    }

    get axis():any {
        return this._axis;
    }

    isValid():boolean {
        return this.start &&
               this.end &&
               this.axis &&
               (this.start < this.end) &&
               this.validPlots.length > 0;
    }

    toURLSearchParams(params: HttpParams = new HttpParams()): Promise<HttpParams> {
        params = params.set('climate_data','1')
                    .set('request_src','npn-vis-scatter-plot')
                    .set('start_date',`${this.start}-01-01`)
                    .set('end_date',`${this.end}-12-31`);
        return super.toURLSearchParams(params);
    }

    toPOPInput(input:POPInput = {...BASE_POP_INPUT}):Promise<POPInput> {
        return super.toPOPInput(input)
            .then(input => {
                input.startDate = `${this.start}-01-01`;
                input.endDate = `${this.end}-12-31`;
                return input;
            });
    }

    doyDateFormat(doy:number):string {
        let start = new Date(this.start,0,1),
            time = ((doy-1)*ONE_DAY_MILLIS)+start.getTime(), // TODO, not enforcing that start/end be midnight on Jan 1
            date = new Date(time);
        return this.d3DateFormat(date);
    }

    // data access functions, not sure if the functionality here is too specific
    // to the visualization of the resulting data so should be held somewhere else
    // but it's here for now
    getDoy(d): any {
        return this.individualPhenometrics ? d.first_yes_doy : d.mean_first_yes_doy;
    }

    getFirstYesYear(d): any {
        return this.individualPhenometrics ? d.first_yes_year : d.mean_first_yes_year;
    }

    axisData(d:any):number {
        return d[this.axis.key];
    }

    axisNonNull(data:any[]): any[] {
        return data.filter((d) => {
            return this.axisData(d) !== NULL_DATA;
        });
    }

    postProcessData(data:any[]):any[] {
        let colorKey = (d) => { return `${d.species_id}:${d.phenophase_id}`},
            colorMap = this.validPlots.reduce((map,p) => {
                map[`${p.species.species_id}:${p.phenophase.phenophase_id}`] = p.color;
                return map;
            },{}),
            startYear = this.start,
            minDoy = this.minDoy,
            maxDoy = this.maxDoy,
            result = data.filter((d,i) => {
                const doy = this.getDoy(d);
                if(doy < minDoy || doy > maxDoy) {
                    return false;
                }
                d.color = colorMap[colorKey(d)];
                d.id = i;
                d.fyy = this.getFirstYesYear(d);
                for(let summaryKey in KEYS_TO_NORMALIZE) {
                    let siteKey = KEYS_TO_NORMALIZE[summaryKey];
                    if(typeof(d[summaryKey]) === 'undefined') {
                        d[summaryKey] = d[siteKey];
                    }
                }
                // this is the day # that will get plotted 1 being the first day of the start_year
                // 366 being the first day of start_year+1, etc.
                d.day_in_range = ((d.fyy-startYear)*365)+doy;
                return true;
            });
        this.working = false;
        return result;
    }
}
