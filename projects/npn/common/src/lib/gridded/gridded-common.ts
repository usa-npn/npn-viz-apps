import {Inject,Injectable} from '@angular/core';
import {NPN_CONFIGURATION,NpnConfiguration} from '../common/index';

const EXTENT_DATE_FMT_REGEX = /^(\d\d\d\d)-0?(\d+)-0?(\d+)/;

export function parseExtentDate(s:string):Date {
    let match = EXTENT_DATE_FMT_REGEX.exec(s.replace(/T.*$/, '')),
    year = parseInt(match[1]),
    month = parseInt(match[2]) - 1,
    day = parseInt(match[3]);
    return new Date(year, month, day);
}

export interface WmsLayerFilterDef {
    name: string;
    args?: any[];
    // WmsMapLayer stores some stuff here??
    values?: any[];
}

interface WmsLayerCommon {
    name: string;
    /** contains a description of a given layer.  this value can also be specified at the top level so that it applies to all layers in all categories (as the default). */
    description?: string;
    /** specifies a boolean indicating if a layer supports plotting of data on it or not (default true). */
    supports_data?: boolean;
    /** specifies an angular filter and optional arguments used to translate point data into strings for legends and map info windows. */
    legend_label_filter?: WmsLayerFilterDef;
    /** specifies an angular filter and optional arguments used to translate point data into strings for point data map info windows (if not specified then `legend_label_filter` will be used). */
    gridded_label_filter?: WmsLayerFilterDef;
    /** specifies an angualr filter and optional arguments used to filter extent values for layers. */
    extent_values_filter?: WmsLayerFilterDef;
    /** specifies anangular filter and optional arguments used to select a default value.  (if not specified the default provided by the server will be used). */
    extent_default_filter?: WmsLayerFilterDef;
    /** specifies a string that should be placed on the legend below the cell labels (units separated from legend labels). */
    legend_units?: string;
    legend_delimiter_every?: number;
    /** specifies a boolean indicating if a layer supports plotting of time series data (default false). */
    supports_time_series?: boolean;
    /** if `supports_data` is true (or unspecified) the indicates that a given layer should only support plotting of data for the year of the currently selected extent on it (default false). */
    current_year_only?: boolean;
}

export interface WmsLayerDefinition extends WmsLayerCommon {
    title?: string;
    // TODO strongly type?
    extent?: any;
}

export interface WmsLayerCategory extends WmsLayerCommon {
    layers: WmsLayerDefinition[];
}

export interface WmsLayerDefs {
    description?: string;
    categories: WmsLayerCategory[];
}

export const MAP_LAYERS:WmsLayerDefs = {
    "description": "",
    "categories": [{
        "name": "Temperature Accumulations, Daily 30-year Average",
        "supports_data": false,
        "legend_label_filter": {
            "name": "legendGddUnits",
            "args": [false]
        },
        "gridded_label_filter": {
            "name": "legendGddUnits",
            "args": [true]
        },
        "extent_default_filter": {
            "name": "agddDefaultTodayElevation"
        },
        "legend_units" : "Growing Degree Days",
        "legend_delimiter_every" : 2000,
        "layers":[{
                "name": "gdd:30yr_avg_agdd"
            },{
                "name": "gdd:30yr_avg_agdd_50f"
            }]
    },{
        "name": "Temperature Accumulations, Current Day",
        "supports_data": false,
        "legend_label_filter": {
            "name": "legendGddUnits",
            "args": [false]
        },
        "gridded_label_filter": {
            "name": "legendGddUnits",
            "args": [true]
        },
        "extent_default_filter": {
            "name": "agddDefaultTodayTime"
        },
        "legend_units" : "Growing Degree Days",
        "legend_delimiter_every" : 2000,
        "supports_time_series": true,
        "layers":[{
                "name": "gdd:agdd"
            },{
                "name": "gdd:agdd_50f"
            }]
    },{
        "name": "Temperature Accumulations, Current Day, Alaska",
        "supports_data": false,
        "legend_label_filter": {
            "name": "legendGddUnits",
            "args": [false]
        },
        "gridded_label_filter": {
            "name": "legendGddUnits",
            "args": [true]
        },
        "extent_values_filter": {
            "name": "extentDates",
            "args": [null,"today"]
        },
        "legend_units" : "Growing Degree Days",
        "legend_delimiter_every" : 2000,
        "layers":[{
            "name": "gdd:agdd_alaska"
        },{
            "name": "gdd:agdd_alaska_50f"
        }]
    },{
        "name": "Temperature Accumulations, Daily Anomaly",
        "supports_data": false,
        "legend_label_filter": {
            "name": "legendAgddAnomaly",
            "args": [false]
        },
        "gridded_label_filter": {
            "name": "legendAgddAnomaly",
            "args": [true]
        },
        "extent_default_filter": {
            "name": "agddDefaultTodayTime"
        },
        "legend_units" : "Growing Degree Days",
        "legend_delimiter_every" : 100,
        "layers":[{
                "name": "gdd:agdd_anomaly"
            },{
                "name": "gdd:agdd_anomaly_50f"
            }]
    },{
        "name": "Spring Indices, Historical Annual",
        "legend_label_filter": {
            "name": "legendDoy"
        },
        "current_year_only": true,
        "layers":[{
				"name": "si-x:average_leaf_prism"
            },{
				"name": "si-x:average_bloom_prism"
            },{
                "name": "si-x:arnoldred_leaf_prism"
            },{
                "name": "si-x:arnoldred_bloom_prism"
            },{
                "name": "si-x:lilac_leaf_prism"
            },{
                "name": "si-x:lilac_bloom_prism"
            },{
                "name": "si-x:zabelli_leaf_prism"
            },{
                "name": "si-x:zabelli_bloom_prism"
            }]
    },{
        "name": "Spring Indices, Current Year",
        "legend_label_filter": {
            "name": "legendDoy"
        },
        "extent_default_filter": {
            "name": "agddDefaultTodayTime"
        },
        "current_year_only": true,
        "layers": [{
				"name": "si-x:average_leaf_ncep"
            },{
				"name": "si-x:average_bloom_ncep"
            },{
                "name": "si-x:arnoldred_leaf_ncep"
            },{
                "name": "si-x:arnoldred_bloom_ncep"
            },{
                "name": "si-x:lilac_leaf_ncep"
            },{
                "name": "si-x:lilac_bloom_ncep"
            },{
                "name": "si-x:zabelli_leaf_ncep"
            },{
                "name": "si-x:zabelli_bloom_ncep"
            }]
    },{
        "name": "Spring Indices, Current Year, Alaska",
        "legend_label_filter": {
            "name": "legendDoy"
        },
        "extent_values_filter": {
            "name": "extentDates",
            "args": [null,"today"]
        },
        "current_year_only": true,
        "layers": [{
            "name": "si-x:average_leaf_ncep_alaska"
        },{
            "name": "si-x:average_bloom_ncep_alaska"
        },{
            "name": "si-x:arnoldred_leaf_ncep_alaska"
        },{
            "name": "si-x:arnoldred_bloom_ncep_alaska"
        },{
            "name": "si-x:lilac_leaf_ncep_alaska"
        },{
            "name": "si-x:lilac_bloom_ncep_alaska"
        },{
            "name": "si-x:zabelli_leaf_ncep_alaska"
        },{
            "name": "si-x:zabelli_bloom_ncep_alaska"
        }]
    },{
        "name": "Spring Indices, Daily Anomaly",
        "supports_data": false,
        "legend_label_filter": {
            "name": "legendSixAnomaly"
        },
        "extent_default_filter": {
            "name": "agddDefaultTodayTime"
        },
        "layers": [{
                "name": "si-x:leaf_anomaly"
            },{
                "name": "si-x:bloom_anomaly"
            }]
    },{
        "name": "Spring Indices, 30-Year Average",
        "legend_label_filter": {
            "name": "legendDoy"
        },
        "extent_default_filter": {
            "name": "agddDefaultTodayElevation"
        },
        "layers": [{
                "name": "si-x:30yr_avg_six_leaf"
            },{
                "name": "si-x:30yr_avg_six_bloom"
            }]
    }]
};

// not safe to change since the capabilities document format changes based on version
// so a version change -may- require code changes wrt interpreting the document
export const WMS_VERSION = '1.1.1';
export const BOX_SIZE = 256;
export const BASE_WMS_ARGS = {
    service: 'WMS',
    request: 'GetMap',
    version: WMS_VERSION,
    layers: undefined, // gets filled in per layer
    styles: '',
    format: 'image/png',
    transparent: true,
    height: BOX_SIZE,
    width: BOX_SIZE,
    srs: 'EPSG:3857' // 'EPSG:4326'
};

@Injectable()
export class GriddedUrls {
    readonly geoServerUrl:string;
    readonly wmsBaseUrl;
    readonly wmsCapabilitiesUrl;

    constructor(@Inject(NPN_CONFIGURATION) public config:NpnConfiguration) {
        this.geoServerUrl = config.geoServerRoot;
        this.wmsBaseUrl = `${this.geoServerUrl}/wms`;
        this.wmsCapabilitiesUrl = `${this.wmsBaseUrl}?service=wms&version=${WMS_VERSION}&request=GetCapabilities`;
    }
}
