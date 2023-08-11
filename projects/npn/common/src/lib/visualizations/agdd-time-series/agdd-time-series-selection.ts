import { VisSelection, selectionProperty } from '../vis-selection';
import { NpnServiceUtils } from '@npn/common/common';

import * as d3 from 'd3';
import { MapLayer, NpnMapLayerService, PestMapLayer, CATEGORY_PEST, MapLayerLegend } from '@npn/common/gridded';
import { Subject } from 'rxjs';

export const CATEGORY_PESTS = CATEGORY_PEST;
export const CATEGORY_TEMP_ACCUMULATIONS = 'Daily Temperature Accumulations';

const DATE_FORMAT = d3.timeFormat('%Y-%m-%d');
export const DATA_FUNC = (d:TimeSeriesDataPoint):number => !!d.agdd ? d.agdd : d.point_value;
const DOY_MAP = (data:TimeSeriesDataPoint[]) => data.reduce((map,d) => {
        map[d.doy] = DATA_FUNC(d);
        return map;
    },{});

export interface TimeSeriesDataPoint {
    agdd?: number;
    gdd?: number;
    point_value: number;
    doy: number;
    date?: string;
}

const COERCE_TIME_SERIES_RESPONSE = (data):TimeSeriesDataPoint[] => {
    if(data && Array.isArray(data.timeSeries)) { // pointTimeSeries response
        return data.timeSeries as TimeSeriesDataPoint[];
    }
    if(data && !Array.isArray(data)) {
        console.warn('HANDLE_TIME_SERIES_RESPONSE data not array')
        return [];
    }
    return data as TimeSeriesDataPoint[];
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

const GDD_AGDD_LAYER_NAME = 'gdd:agdd';
export const DEFAULT_AGDD_LAYER_CATEGORY = CATEGORY_TEMP_ACCUMULATIONS;
export const DEFAULT_AGDD_LAYER_NAME = GDD_AGDD_LAYER_NAME;

export class AgddTimeSeriesSelection extends VisSelection {
    @selectionProperty()
    $class:string = 'AgddTimeSeriesSelection';

    @selectionProperty()
    private _latLng:number[];
    @selectionProperty()
    _layerCategory:string = DEFAULT_AGDD_LAYER_CATEGORY;
    @selectionProperty()
    private _layerName:string = DEFAULT_AGDD_LAYER_NAME;
    @selectionProperty()
    private _extentValue:string;

    @selectionProperty()
    private _showLastYear:boolean = false;
    @selectionProperty()
    private _threshold:number;
    thresholdCeiling:number = 20000;
    @selectionProperty()
    private _doy:number;

    layer:MapLayer;
    legend:MapLayerLegend;

    constructor(private layerService:NpnMapLayerService,protected serviceUtils:NpnServiceUtils) {
        super();
    }

    isValid():boolean {
        return !!this._layerName && !!this.latLng && this.latLng.length === 2;
    }

    private _monitorLayerChange:Subject<string>;
    monitorLayerChange():Subject<string> {
        if(!this._monitorLayerChange) {
            this._monitorLayerChange = new Subject();
        }
        return this._monitorLayerChange;
    }

    endMonitorLayerChange():void {
        if(this._monitorLayerChange) {
            this._monitorLayerChange.complete();
            this._monitorLayerChange = undefined;
        }
    }

    get layerName():string { return this._layerName; }
    set layerName(l:string) {
        this._layerName = l;
        if(this.layer && this.layer.layerName !== l) {
            this.layer.off(); // shouldn't be necessary
            this._getLayer = undefined;
            this.layer = undefined;
            this.legend = null;
            this._start = undefined;
            this._end = undefined;
            this._selectedData = undefined;
            this._averageData = undefined;
            this._previousData = undefined;
            this._timeSeriesUrl = undefined;
            this._selectedParamsBasis = undefined;
            // let the layer initially dictate threshold
            delete this._threshold;
        }
        if(this._monitorLayerChange) {
            this._monitorLayerChange.next(this._layerName);
        }
        this.update();
    }

    set layerCategory(s:string) {
        this._layerCategory = s;
        //this.layerName = null;
    }
    get layerCategory():string { return this._layerCategory; }

    private updateExtentValue() {
        if(this.layer && this._extentValue) {
            const newValue = this.layer.extent.values.reduce((found,v) => found||(v.value === this._extentValue ? v : undefined),undefined);
            if(newValue && this.layer.extent.current !== newValue) {
                this.layer.extent.current = newValue;
                if(this.layer.getMap()) {
                    this.layer.bounce();
                }
            }
        }
    }

    get extentValue():string { return this._extentValue; }
    set extentValue(v:string) {
        // technically changes to extent that result in a year
        // change require an update, but during population
        // of layer/extent, etc. the selection should be paused
        // "end" date changed as a result.
        if(v !== this._extentValue) {
            this._extentValue = v;
            this._start = undefined;
            this._end = undefined;
            this._selectedData = undefined;
            this._averageData = undefined;
            this._previousData = undefined;
            this.updateExtentValue();
            this.update();
        }
    }

    /**
     * The resulting layer will be disconnected from a map.
     * External callers may call setMap(m) and on/off but
     * this selection does not directly use the layer in conjunction
     * with a map.
     * 
     * If the selection does not have an associated layerName the
     * resulting Promise will be rejected immediately.
     */
    _getLayer:Promise<MapLayer>;
    getLayer():Promise<MapLayer> {
        if(!this.layerName) {
            return Promise.reject();
        }
        if(!this._getLayer) {
            this._getLayer = this.layerService.newLayer(null,this.layerName)
                .then(layer => this.layer = layer)
                .then(layer => {
                    this.updateExtentValue();
                    // on aside get legend but still return layer
                    layer.getLegend().then(l => this.legend = l);
                    return layer;
                });
        }
        return this._getLayer;
    }

    /**
     * The base temperature value for the underlying layer.
     * This code assumes that only a certain subset of layers
     * are suitable for this visualization.
     */
    get baseTemp():number {
        let base = 32;
        if(this.layer) {
            base = this.layer.layerBasis === GDD_AGDD_LAYER_NAME ? 32 : 50;
            const meta = this.layer.layerDefinition.meta;
            // special cases
            if(meta && meta.agddBaseTemp) {
                base = meta.agddBaseTemp;
            }
        }
        return base;
    }

    private _end:Date;
    /**
     * Fetches the end date for pulling the time series.
     * If the current layer extent is for this year then
     * the end will be the maximum available extent date
     * otherwise 12/31 of the extent year.
     */
    private get end():Date {
        if(!this._end) {
            const {layer} = this;
            if(!layer) {
                return new Date((new Date).getFullYear(),11,31);
            }
            const current = layer.extent.current.date;
            const extentYear = current.getFullYear();
            if(extentYear === (new Date()).getFullYear()) {
                // end is the maximum extent
                this._end = new Date(layer.extent.values[layer.extent.values.length-1].date.getTime());
            } else {
                // dec 31 of the extent year
                this._end = new Date(extentYear,11,31);
            }
        }
        return this._end;
    }
    private _start:Date;
    private get start():Date {
        const {layer} = this;
        if(!layer) {
            // don't cache
            return new Date(this.end.getFullYear(),0,1);
        }
        return this._start||(this._start = new Date(this.end.getFullYear(),0,1));
    }

    private _timeSeriesUrl:Promise<string>;
    private get timeSeriesUrl():Promise<string> {
        if(!this._timeSeriesUrl) {
            this._timeSeriesUrl = this.layer instanceof PestMapLayer
                ? this.layer.getTimeSeriesUrl()
                : Promise.resolve(this.serviceUtils.dataApiUrl(`/v1/agdd/simple/pointTimeSeries`));
        }
        return this._timeSeriesUrl;
    }

    private get show30YearAverage():boolean {
        if(this.layer) {
            const {meta} = this.layer.layerDefinition;
            if(meta && typeof(meta.agddSupports30YearAvg) === 'boolean') {
                return meta.agddSupports30YearAvg;
            }
        }
        return true;
    }

    get threshold():number { 
        if(this._threshold) {
            return this._threshold;
        }
        if(this.layer) {
            const {meta} = this.layer.layerDefinition;
            if(meta && typeof(meta.agddDefaultThreshold) === 'number') {
                return meta.agddDefaultThreshold;
            }
        }
        return 1000;
    }
    set threshold(t:number) {
        this._threshold = t;
        this.redraw();
    }

    get latLng():number[] { return this._latLng; }
    set latLng(ltlng:number[]) {
        this._latLng = ltlng;
        this._selectedData = undefined;
        this._averageData = undefined;
        this._previousData = undefined;
        this.update();
    }

    /** Whether or not the range of the time series can support previous data. */
    get lastYearValid():boolean {
        return (this.start.getFullYear()-1) >= 2016; // time series data starts in 2016
    }

    get showLastYear():boolean {
        if(this.layer) {
            return this.lastYearValid ? this._showLastYear : false;
        }
        return this._showLastYear;
    }
    set showLastYear(b:boolean) {
        this._showLastYear = b;
        this.update();
    }

    // controls visually how much of the year is drawn on the visualization
    // e.g. allows for zooming in on the beginning of a year
    get doy():number { return this._doy||365; }
    set doy(d:number) {
        this._doy = d;
        // this is kind of a workaround but redraws update
        // the bounds of the axes and for some reason inconsistently
        // lines go wonky, resize re-writes the entire visualization
        // and the problem does not occur then
        // doing this since not sufficient time to better understand.
        //this.redraw();
        this.resize();
    }

    private _averageData:Promise<AgddTimeSeriesDataHolder>;
    private averageData():Promise<AgddTimeSeriesDataHolder> {
        if(!this._averageData) {
            const [latitude,longitude] = this.latLng;
            // this doesn't feel quite robust enough
            const layer = this.baseTemp === 32 ? 'gdd:30yr_avg_agdd' : 'gdd:30yr_avg_agdd_50f';
            this._averageData = this.serviceUtils.get(
                this.serviceUtils.apiUrl('/npn_portal/stations/getTimeSeries.json'),
                {latitude,longitude,layer})
                .then(COERCE_TIME_SERIES_RESPONSE)
                .then(data => ({
                    data,
                    doyMap: DOY_MAP(data),
                    year:'30-year Average',
                    color: AGDD_COLORS.average
                }));
        }
        return this._averageData;
    }

    private _selectedParamsBasis:Promise<any>;
    private get selectedParamsBasis():Promise<any> {
        if(!this._selectedParamsBasis) {
            return this._selectedParamsBasis = this.layer instanceof PestMapLayer
                ? this.layer.getPestDescription()
                    .then(pest => {
                        let {lowerThreshold,upperThreshold,base} = pest;
                        lowerThreshold = lowerThreshold||0;
                        upperThreshold = upperThreshold||0;
                        base = base||lowerThreshold||this.baseTemp
                        return {lowerThreshold,upperThreshold,base};
                    })
                : Promise.resolve({
                    upperThreshold: 0,
                    lowerThreshold: 0,
                    base: this.baseTemp
                });
        }
        return this._selectedParamsBasis;
    }

    private get selectedParams():Promise<any> {
        const [latitude,longitude] = this.latLng;
        const startDate = DATE_FORMAT(this.start);
        const start_date = startDate;
        const endDate = DATE_FORMAT(this.end);
        const end_date = endDate;
        return Promise.all([
            this.timeSeriesUrl,
            this.selectedParamsBasis
        ]).then(results => {
            const [timeSeriesUrl,paramsBasis] = results;
            const {lowerThreshold,upperThreshold,base} = paramsBasis;
            // NOTE: some pests have a "base" but lowerThreshold is always being used here.
            // e.g. Bronze Birch Borer, Emerald Ash Borer
            return {
                layer: this.layer.layerBasis,
                latitude,longitude,
                climateProvider: 'NCEP',
                temperatureUnit: 'fahrenheit',
                timeSeriesUrl,
                startDate,start_date,
                endDate,end_date,
                base,
                lowerThreshold,
                upperThreshold
            };
        });        
    }

    private _selectedData:Promise<AgddTimeSeriesDataHolder>;
    private selectedData():Promise<AgddTimeSeriesDataHolder> { // always the full shooting match, forecast can/will be pulled from this
        if(!this._selectedData) {
            this._selectedData = Promise.all([
                this.timeSeriesUrl,
                this.selectedParams
            ]).then(results => {
                const [timeSeriesUrl,selectedParams] = results;
                return this.serviceUtils.get(timeSeriesUrl,selectedParams)
                    .then(COERCE_TIME_SERIES_RESPONSE)
                    .then(data => ({
                        data,
                        doyMap: DOY_MAP(data),
                        year:this.start.getFullYear(),
                        color: AGDD_COLORS.selected
                    }))
            });  
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
            this._previousData = Promise.all([
                this.timeSeriesUrl,
                this.selectedParams
            ]).then(results => {
                const [timeSeriesUrl,selectedParams] = results;
                const params = {...selectedParams,startDate,start_date,endDate,end_date};
                return this.serviceUtils.get(timeSeriesUrl,params)
                    .then(COERCE_TIME_SERIES_RESPONSE)
                    .then(data => ({
                        data,
                        doyMap: DOY_MAP(data),
                        year:lastYear,
                        color: AGDD_COLORS.previous
                    }));
            });  
        }
        return this._previousData;
    }

    data():Promise<AgddTimeSeriesData> {
        this.working = true;
        return this.getLayer()
            .then(layer => {
                //this._latLng = [25.240821110543152,-80.56457375588832]; // TODO remove dev values.
                //this._showLastYear = true;
                const promises = [this.selectedData()];
                if(this.show30YearAverage) {
                    promises.push(this.averageData());
                }
                if(this.showLastYear && this.lastYearValid) {
                    promises.push(this.previousData());
                }
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
            });
    }
}