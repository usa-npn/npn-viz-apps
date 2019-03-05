import { VisSelection, selectionProperty } from '../vis-selection';
import { NpnServiceUtils } from '@npn/common/common';

import * as d3 from 'd3';

const DATE_FORMAT = d3.timeFormat('%Y-%m-%d');
export const DATA_FUNC = (d:TimeSeriesDataPoint):number => !!d.agdd ? d.agdd : d.point_value;
const DOY_MAP = (data:TimeSeriesDataPoint[]) => data.reduce((map,d) => {
        map[d.doy] = DATA_FUNC(d);
        return map;
    },{});

export interface TimeSeriesDataPoint {
    agdd?: number;
    point_value: number;
    doy: number;
    date?: string;
}

export interface AgddTimeSeriesDataHolder {
    data: TimeSeriesDataPoint[]; // full series
    filtered?: TimeSeriesDataPoint[]; // used by the visualization
    plotted?: boolean;
    focus?: any;
    doyMap?: any;
    year?: any;
    color?: string;
}

export interface AgddTimeSeriesData {
    average?: AgddTimeSeriesDataHolder;
    selected?: AgddTimeSeriesDataHolder;
    previous?: AgddTimeSeriesDataHolder;
    forecast?: AgddTimeSeriesDataHolder;
}

export const AGDD_COLORS = {
    average: 'black',
    selected: 'blue',
    previous: 'orange',
    forecast: 'red'
};

/**
 * @todo remove used of cachedGet
 */
export class AgddTimeSeriesSelection extends VisSelection {
    @selectionProperty()
    $class:string = 'AgddTimeSeriesSelection';

    @selectionProperty()
    private _latLng:number[];
    @selectionProperty()
    private _showLastYear:boolean = false;
    @selectionProperty()
    private _threshold:number = 1000; // TODO if layer gets involved this "default" will be based on the layer
    thresholdCeiling:number = 1000;
    @selectionProperty()
    private _doy:number;

    constructor(protected serviceUtils:NpnServiceUtils) {
        super();
    }

    isValid():boolean {
        return true; // TODO
    }

    get baseTemp():number {
        // TODO this is based on a layer....
        return 32;
    }

    get latLng():number[] { return this._latLng; }
    set latLng(ltlng:number[]) {
        this._latLng = ltlng;
        this.update();
    }

    get showLastYear():boolean { return this._showLastYear; }
    set showLastYear(b:boolean) {
        this._showLastYear = b;
        this.update();
    }

    get show30YearAverage():boolean {
        // TODO some layers do not support
        return true;
    }

    // TODO threshold changes based on layer
    get threshold():number { return this._threshold||1000; }
    set threshold(t:number) {
        this._threshold = t;
        this.redraw();
    }

    get doy():number { return this._doy||71/*365*/; }
    set doy(d:number) {
        this._doy = d;
        this.redraw();
    }

    private _end:Date;
    get end():Date {
        // TODO need a layer to move "end" out in the case of forecast
        // for now adding 6 days
        return this._end||(this._end = new Date(Date.now() + 6*24*60*60*1000));
    }
    private _start:Date;
    get start():Date {
        return this._start||(this._start = new Date(this.end.getFullYear(),0,1));
    }

    get timeSeriesUrl():string {
        // TODO this may change based on layer
        return this.serviceUtils.apiUrl('/npn_portal/stations/getTimeSeries.json');
    }

    private _averageData:Promise<AgddTimeSeriesDataHolder>;
    private averageData():Promise<AgddTimeSeriesDataHolder> {
        if(!this._averageData) {
            const [latitude,longitude] = this.latLng;
            const layer = 'gdd:30yr_avg_agdd'; // TODO dummy data
            this._averageData = this.serviceUtils.cachedGet(
                this.serviceUtils.apiUrl('/npn_portal/stations/getTimeSeries.json'),
                {latitude,longitude,layer})
                .then(data => data as TimeSeriesDataPoint[])
                .then(data => ({
                    data,
                    doyMap: DOY_MAP(data),
                    year:'30-year Average',
                    color: AGDD_COLORS.average
                }));
        }
        return this._averageData;
    }

    // TODO there is more missing here like lower/upperThreshold, etc.
    get selectedParams():any {
        const [latitude,longitude] = this.latLng;
        const startDate = DATE_FORMAT(this.start);
        const start_date = startDate;
        const endDate = DATE_FORMAT(this.end);
        const end_date = endDate;
        return {
            base: 0,
            upperThreshold: 0,
            climateProvider: 'NCEP',
            startDate,start_date,
            endDate,end_date,
            temperatureUnit: 'fahrenheit',
            timeSeriesUrl: this.timeSeriesUrl,
            latitude,
            longitude,
            layer: 'gdd:agdd',
        };
    }

    private _selectedData:Promise<AgddTimeSeriesDataHolder>;
    private selectedData():Promise<AgddTimeSeriesDataHolder> { // always the full shooting match, forecast can/will be pulled from this
        if(!this._selectedData) {
            this._selectedData = this.serviceUtils.cachedGet(this.timeSeriesUrl,this.selectedParams)
                .then(data => data as TimeSeriesDataPoint[])
                .then(data => ({
                    data,
                    doyMap: DOY_MAP(data),
                    year:this.start.getFullYear(),
                    color: AGDD_COLORS.selected
                }))
        }
        return this._selectedData;
    }

    private _previousData:Promise<AgddTimeSeriesDataHolder>;
    private previousData():Promise<AgddTimeSeriesDataHolder> {
        if(!this._previousData) {
            const lastYear = this.start.getFullYear()-1;
            const start = new Date(lastYear,0,1);
            const end = new Date(lastYear,11,31);
            const startDate = DATE_FORMAT(start);
            const start_date = startDate;
            const endDate = DATE_FORMAT(end);
            const end_date = endDate;
            const params = {...this.selectedParams,startDate,start_date,endDate,end_date};
            this._previousData = this.serviceUtils.cachedGet(this.timeSeriesUrl,params)
                .then(data => data as TimeSeriesDataPoint[])
                .then(data => ({
                    data,
                    doyMap: DOY_MAP(data),
                    year:lastYear,
                    color: AGDD_COLORS.previous
                }));
        }
        return this._previousData;
    }

    data():Promise<AgddTimeSeriesData> {
        this._latLng = [25.240821110543152,-80.56457375588832]; // TODO remove dev values.
        this._showLastYear = true;
        const promises = [this.selectedData()];
        if(this.show30YearAverage) {
            promises.push(this.averageData());
        }
        if(this.showLastYear) {
            promises.push(this.previousData())
        }
        this.working = true;
        return Promise.all(promises)
            .then(results => {
                let [selected,average,previous] = results;
                let forecast:AgddTimeSeriesDataHolder;
                if(this.end.getFullYear() === (new Date()).getFullYear()) { // this may always be true depending on "end"
                    const todayFormatted = DATE_FORMAT(new Date());
                    selected = {
                        ...selected,
                        data: selected.data.reduce((arr,d) => {
                            if(!forecast) {
                                arr.push(d);
                                if(todayFormatted === d.date) {
                                    // include the last day of the selected range in the forecast so the two connect on the graph
                                    forecast = {
                                        data:[d],
                                        year: `${this.start.getFullYear()} forecast`,
                                        color: AGDD_COLORS.forecast
                                    };
                                }
                            } else {
                                forecast.data.push(d);
                            }
                            return arr;
                        },[])};
                    if(forecast) {
                        forecast.doyMap = DOY_MAP(forecast.data);
                    }
                }
                this.working = false;
                return {average,selected,forecast,previous};
            });
    }
}