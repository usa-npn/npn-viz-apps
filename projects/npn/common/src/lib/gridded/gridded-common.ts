import {Inject,Injectable} from '@angular/core';
import {NPN_CONFIGURATION,NpnConfiguration} from '../common/index';

export const MAP_STYLES:any[] = [{
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
}, {
    featureType: 'transit.station',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
},
{
    featureType: 'poi.park',
    stylers: [{ visibility: 'off' }]
},
{
    featureType: 'landscape',
    stylers: [{ visibility: 'off' }]
}];

const EXTENT_DATE_FMT_REGEX = /^(\d\d\d\d)-0?(\d+)-0?(\d+)/;

export function parseExtentDate(s:string):Date {
    let match = EXTENT_DATE_FMT_REGEX.exec(s.replace(/T.*$/, '')),
    year = parseInt(match[1]),
    month = parseInt(match[2]) - 1,
    day = parseInt(match[3]);
    return new Date(year, month, day);
}

export interface NpnLayerFilterDef {
    name: string;
    args?: any[];
    // WmsMapLayer stores some stuff here??
    values?: any[];
}

export enum MapLayerType {
    STANDARD = 'standard',
    PEST = 'pest'
}

interface NpnLayerCommon {
    name: string;
    layerBasis?: string;
    /** contains a description of a given layer.  this value can also be specified at the top level so that it applies to all layers in all categories (as the default). */
    description?: string;
    /** specifies a boolean indicating if a layer supports plotting of data on it or not (default true). */
    supports_data?: boolean;
    /** specifies an angular filter and optional arguments used to translate point data into strings for legends and map info windows. */
    legend_label_filter?: NpnLayerFilterDef;
    /** specifies an angular filter and optional arguments used to translate point data into strings for point data map info windows (if not specified then `legend_label_filter` will be used). */
    gridded_label_filter?: NpnLayerFilterDef;
    /** specifies an angualr filter and optional arguments used to filter extent values for layers. */
    extent_values_filter?: NpnLayerFilterDef;
    /** specifies anangular filter and optional arguments used to select a default value.  (if not specified the default provided by the server will be used). */
    extent_default_filter?: NpnLayerFilterDef;
    /** specifies a string that should be placed on the legend below the cell labels (units separated from legend labels). */
    legend_units?: string;
    legend_delimiter_every?: number;
    /** specifies a boolean indicating if a layer supports plotting of time series data (default false). */
    supports_time_series?: boolean;
    /** if `supports_data` is true (or unspecified) the indicates that a given layer should only support plotting of data for the year of the currently selected extent on it (default false). */
    current_year_only?: boolean;
    /** defaults to `WmsLayerType.STANDARD` */
    type?: MapLayerType;
}

export enum MapLayerServiceType {
    WMS = 'wms',
    WCS = 'wcs'
};

export interface MapLayerExtentValue {
    /** The raw extent value from the WMS layer definition */
    value: string;
    /** If `value` represents a Date then the parsed Date object. */
    date?: Date;
    /** The value transformed into a readable label. */
    label: string;
    /** Add extent value to a service request's parameters */
    addToParams: (params:any,serviceType:MapLayerServiceType) => void;
}

export enum MapLayerExtentType {
    DATE = 'date',
    YEAR = 'year',
    DOY = 'doy'
}

export interface MapLayerExtent {
    current?: MapLayerExtentValue;
    label: string;
    type: MapLayerExtentType;
    values?: MapLayerExtentValue[];
}

export interface MapLayerBoundingBox {
    westBoundLongitude: number;
    eastBoundLongitude: number;
    southBoundLatitude: number;
    northBoundLatitude: number;
    getBounds: () => google.maps.LatLngBounds;
}

export interface MapLayerStyle {
    name: string;
    title: string;
    legend: string; // URL
}

export interface MapLayerDefinition extends NpnLayerCommon {
    title?: string;
    abstract?: string;
    /** Minimum width for legend style (e.g. '200px' or '50%') used to set the `min-width` CSS style on the corresponding legend. */
    minLegendWidth?: string;
    extent?: MapLayerExtent;
    bbox?: MapLayerBoundingBox;
    style?: MapLayerStyle;
    /** A place for special map implementations to put special info... */
    meta?: any;
}

// definition of separate over-rides document
export interface MapLayerDefinitionMap {
    [name:string]: MapLayerDefinition;
}

export interface MapLayerCategory extends NpnLayerCommon {
    layers: MapLayerDefinition[];
}

export interface MapLayerDefs {
    description?: string;
    categories: MapLayerCategory[];
}

export interface LegendData {
    color: string;
    quantity: number;
    original_label: string;
    label: string;
}

export interface GriddedPointData {
    point: number;
    legendData: LegendData;
    formatted: string;
}

export const CATEGORY_PEST = 'Pheno Forecasts';
export const CATEGORY_TEMP_ACCUM_30_YR_AVG = 'Temperature Accumulations, Daily 30-year Average';
export const CATEGORY_TEMP_ACCUM_CURRENT = 'Temperature Accumulations, Current Day';
export const CATEGORY_TEMP_ACCUM_CURRENT_AK = 'Temperature Accumulations, Current Day, Alaska';
export const CATEGORY_TEMP_ACCUM_DAILY_ANOM = 'Temperature Accumulations, Daily Anomaly';
export const CATEGORY_SIX_HIST_ANNUAL = 'Spring Indices, Historical Annual';
export const CATEGORY_SIX_CURRENT_YEAR = 'Spring Indices, Current Year';
export const CATEGORY_SIX_CURRENT_YEAR_AK = 'Spring Indices, Current Year, Alaska';
export const CATEGORY_SIX_DAILY_ANOM = 'Spring Indices, Daily Anomaly';
export const CATEGORY_SIX_30_YR_AVG = 'Spring Indices, 30-Year Average';

/**
 * Holds all current supported map layers broken down by category.  This structure
 * originated with the original visualization tool and is very meaningful in that
 * commonality in configuration can be configured on the parent category for a given
 * layer and optionally over-ridden below that (for this like pipes to translate values to
 * strings, etc.).
 * 
 * IMPORTANT: See `visualizations/map/consolidated-map-layer-control.component.ts`
 * for the temp accumulations and six layers that code relies on the order
 * of the indexes of the nested layers for those two sets so do NOT change that
 * here.
 */
export const MAP_LAYERS:MapLayerDefs = {
    "description": "",
    "categories": [{
        "name": CATEGORY_PEST,
        "supports_data": false, // TODO they do support data but...
        "layerBasis": "gdd:agdd_50f",
        "legend_label_filter": {
            "name": "legendGddUnits",
            "args": [false]
        },
        "gridded_label_filter": {
            "name": "legendGddUnits",
            "args": [true]
        },
        type: MapLayerType.PEST,
        "layers": [{
            name: 'apple_maggot',
            title: 'Apple Maggot',
            abstract: 'Apple maggot larvae cause damage to ripening fruit. If left untreated, these pest insects can spread across the entire tree. These insects primarily affect apple trees, but can also impact plum, apricot, pear, cherry and hawthorn trees. <a href="https://www.usanpn.org/data/forecasts/Apple_maggot" target="_blank">Learn more</a>',
            meta: {
                agddDefaultThreshold: 900
            }
        },{
            name: 'asian_longhorned_beetle',
            title: 'Asian Longhorned Beetle',
            abstract: 'As a generalist pest, Asian longhorned beetle poses a great potential threat to eastern forests. It is currently contained in three small quarantined areas (a fourth was recently eradicated). Burning firewood where you buy it is critical to stopping the spread of this pest. <a href="https://www.usanpn.org/data/forecasts/Asian_Longhorned_beetle" target="_blank">Learn more</a>',
            meta: {
                agddSupports30YearAvg: false,
                agddDefaultThreshold: 690
            }
        },{
            name: 'bagworm',
            title: 'Bagworm',
            abstract: 'Bagworm caterpillars defoliate over 50 families of evergreen and deciduous trees and shrubs, primarily arborvitae, juniper, pine, and spruce. Stripping of leaves and needles is most noticeable in uppermost parts of plants. If left untreated, these pests are capable of extensive defoliation which can cause branch dieback or death. <a href="https://www.usanpn.org/data/forecasts/Bagworm" target="_blank">Learn more</a>',
            meta: {
                agddDefaultThreshold: 600
            }
        },{
            name: 'bronze_birch_borer',
            title: 'Bronze Birch Borer',
            abstract: 'Bronze birch borer frequently kills birch trees by boring into the wood. <a href="https://www.usanpn.org/data/forecasts/Bronze_birch_borer" target="_blank">Learn more</a>',
            meta: {
                agddDefaultThreshold: 450
            }
        },{
            name: 'precipitation:buffelgrass_prism',
            title: 'Buffelgrass',
            abstract: 'Buffelgrass is an invasive plant that impacts native desert plant and animal communities in the Southwestern US. It creates substantial fire risk in ecosystems that are not adapted to large-scale intense burning. <a href="https://www.usanpn.org/data/forecasts/Buffelgrass" target="_blank">Learn more</a>'
        },{
            name: 'eastern_tent_caterpillar',
            title: 'Eastern Tent Caterpillar',
            abstract: 'Eastern Tent Caterpillars are a native moth and while they can defoliate trees, the trees rarely die as a consequence. <a href="https://www.usanpn.org/data/forecasts/Eastern_tent_caterpillar" target="_blank">Learn more</a>',
            meta: {
                agddSupports30YearAvg: false,
                agddDefaultThreshold: 90
            }
        },{
            name: 'emerald_ash_borer',
            title: 'Emerald Ash Borer',
            abstract: 'Emerald ash borer is a beetle that causes significant harm to ash trees throughout the eastern United States. <a href="https://www.usanpn.org/data/forecasts/EAB" target="_blank">Learn more</a>',
            meta: {
                agddDefaultThreshold: 450
            }
        },{
            name: 'gypsy_moth',
            title: 'Gypsy Moth',
            abstract: 'European gypsy moth caterpillars feed on deciduous trees, causing major defoliation and tree mortality. They are considered one of the worst forest pests in the United States. <a href="https://www.usanpn.org/data/forecasts/Gypsy_moth" target="_blank">Learn more</a>',
            meta: {
                agddSupports30YearAvg: false,
                agddBaseTemp: 37.4,
                agddDefaultThreshold: 571
            }
        },{
            name: 'hemlock_woolly_adelgid',
            layerBasis: 'gdd:agdd', // based on a different map than the others.
            title: 'Hemlock Woolly Adelgid',
            abstract: 'Hemlock woolly adelgid can be deadly to hemlock trees and, in the eastern United States, lacks enemies that keep their populations in check. Researchers wish to identify the optimal window to release insect predators; you can support this effort by observing hemlock woolly adelgid life cycle stages using Nature’s Notebook. <a href="https://www.usanpn.org/data/forecasts/HWA" target="_blank">Learn more</a>'
        },{
            name: 'magnolia_scale',
            title: 'Magnolia Scale',
            abstract: 'Magnolia scale is a pest native to the Eastern United States that affects magnolia trees and tulip trees. They cause stress to their host trees by removing sap which can lead to yellowing leaves, twig dieback, and even death. <a href="https://www.usanpn.org/data/forecasts/Magnolia_scale" target="_blank">Learn more</a>',
            meta: {
                agddDefaultThreshold: 1938
            }
        },{
            name: 'lilac_borer',
            title: 'Lilac Borer',
            abstract: 'Lilac borer is a clear-wing moth that can damage lilac, ash, and privet trees and shrubs by burrowing into the heartwood. <a href="https://www.usanpn.org/data/forecasts/Lilac_borer" target="_blank">Learn more</a>',
            meta: {
                agddDefaultThreshold: 500
            }
        },{
            name: 'pine_needle_scale',
            title: 'Pine Needle Scale',
            abstract: 'Pine needle scale is a native pest that affects ornamental pines and Christmas tree plantations. <a href="https://www.usanpn.org/data/forecasts/Pine_needle_scale" target="_blank">Learn more</a>',
            meta: {
                agddSupports30YearAvg: false,
                agddDefaultThreshold: 298
            }
        },{
            name: 'winter_moth',
            title: 'Winter Moth',
            abstract: 'Winter moth is a non-native insect pest that causes damage to deciduous trees, particularly maples and oaks. <a href="https://www.usanpn.org/data/forecasts/Winter_moth" target="_blank">Learn more</a>',
            meta: {
                agddDefaultThreshold: 20
            }
        },
        {
            name: 'gdd:winter_wheat',
            title: 'Winter Wheat',
            abstract: 'The USA-NPN winter wheat development forecast predicts the developmental stage of winter wheat from emergence through seed development. Winter wheat is vulnerable to freezing temperatures once it resumes growth in the springtime. <a href="https://www.usanpn.org/data/forecasts/Winter_Wheat" target="_blank">Learn more</a>'
        }]
    },{
        "name": CATEGORY_TEMP_ACCUM_30_YR_AVG,
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
        "name": CATEGORY_TEMP_ACCUM_CURRENT,
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
        "name": CATEGORY_TEMP_ACCUM_CURRENT_AK,
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
        "name": CATEGORY_TEMP_ACCUM_DAILY_ANOM,
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
        "name": CATEGORY_SIX_HIST_ANNUAL,
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
        "name": CATEGORY_SIX_CURRENT_YEAR,
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
        "name": CATEGORY_SIX_CURRENT_YEAR_AK,
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
        "name": CATEGORY_SIX_DAILY_ANOM,
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
        "name": CATEGORY_SIX_30_YR_AVG,
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
