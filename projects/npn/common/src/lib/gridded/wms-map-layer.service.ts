import { Injectable } from '@angular/core';
import * as $jq_ from 'jquery';
const $jq = $jq_;

import { NpnServiceUtils } from '../common/index';
// TODO MAP_LAYERS here has been coded into the application
// it may differ from the FWS apps to the vis-tool???
// depending on how that shakes out perhaps a "provider" Injectable
// that individual apps then wire into this service instance??
import {
    MAP_LAYERS,
    GriddedUrls,
    WmsLayerDefs,
    WmsLayerDefinition,
    parseExtentDate,
    WmsLayerExtentValue,
    WmsLayerExtent,
    WmsLayerBoundingBox,
    WmsLayerStyle,
    WmsLayerExtentType,
    WMS_VERSION
} from './gridded-common';
import { NpnMapLayer, PestMapLayer, WmsMapLayer } from './wms-map-layer';
import { GriddedPipeProvider } from './pipes';
import { WmsMapLegend } from './wms-map-legend';

const DEEP_COPY = (o) => JSON.parse(JSON.stringify(o));

@Injectable()
export class WmsMapLayerService {
    private legends:any = {};
    private layerDefs:any;

    constructor(
        public serviceUtils:NpnServiceUtils,
        public griddedPipes:GriddedPipeProvider,
        public griddedUrls:GriddedUrls
    ) {}

    newLayer(map:google.maps.Map,layerDef:WmsLayerDefinition):NpnMapLayer {
        return layerDef.pest
            ? new PestMapLayer(map,layerDef,this)
            : new WmsMapLayer(map,layerDef,this);
    }

    getLegend(layerDef:WmsLayerDefinition):Promise<WmsMapLegend> {
        if(layerDef.pest) {
            console.log('TODO pest legend');
            return Promise.resolve(null);
        }
        const layerName = layerDef.name;
        if(this.legends[layerName]) {
            return Promise.resolve(this.legends[layerName]);
        }
        return this.serviceUtils.cachedGet(this.griddedUrls.wmsBaseUrl,{
                service: 'wms',
                request: 'GetStyles',
                version: WMS_VERSION,
                layers: layerName
            },true /* as text*/)
            .then(xml => {
                let legend_data = $jq($jq.parseXML(xml)),
                    color_map = legend_data.find('ColorMap');
                if(color_map.length === 0) {
                    // FF
                    color_map = legend_data.find('sld\\:ColorMap');
                }
                let l:WmsMapLegend = color_map.length !== 0 ?
                    new WmsMapLegend(this.griddedPipes,
                            $jq(color_map.toArray()[0]),
                            layerDef,
                            legend_data) : undefined;
                return this.legends[layerName] = l;
            });
    }

    getLayerDefinitions():Promise<WmsLayerDefs> {
        function mergeLayersIntoConfig(wms_layer_defs) {
            let result = DEEP_COPY(MAP_LAYERS),
                base_description = result.description;
            result.categories.forEach(function(category){
                // layers can inherit config like filters (if all in common) from
                // the base category
                let base_config = DEEP_COPY(category);
                delete base_config.name;
                delete base_config.layers;
                base_config.description = base_config.description||base_description;
                category.layers = category.layers.map(l => {
                    let base_copy = DEEP_COPY(base_config);
                    return {...base_copy,...wms_layer_defs[l.name],...l};
                });
            });
            return result;
        }
        if(this.layerDefs) {
            return Promise.resolve(this.layerDefs);
        }
        return this.serviceUtils.cachedGet(this.griddedUrls.wmsCapabilitiesUrl,null,true/*as text*/)
                    .then(xml => {
                        let wms_capabilities = $jq($jq.parseXML(xml));
                        console.debug('WmsMapLayerService:capabilities',wms_capabilities);
                        let wms_layer_defs = this._getLayers(wms_capabilities.find('Layer'));
                        console.debug('WmsMapLayerService:wms layer definitions',wms_layer_defs);
                        this.layerDefs = mergeLayersIntoConfig(wms_layer_defs);
                        console.debug('WmsMapLayerService:layer definitions',this.layerDefs);
                        return this.layerDefs;
                    });
    }

    getLayerDefinition(layerName:string):Promise<WmsLayerDefinition> {
        return this.getLayerDefinitions()
                .then(definitions => {
                    let layerMap = definitions.categories.reduce((map,c) => {
                            c.layers.forEach(l => {
                                map[l.name] = l;
                            });
                            return map;
                        },{});
                    return layerMap[layerName];
                });
    }

    // private functions used to parse layer info out of WMS Capabilities response
    // remain instance functions since they use some injected services
    // returns an associative array of machine name layer to layer definition
    private _getLayers(layers):({[name:string]: WmsLayerDefinition}) {
        if(!layers || layers.length < 2) { // 1st layer is parent, children are the real layers
            return;
        }
        // make it a normal array, not a jQuery one
        let ls = [];
        layers.slice(1).each(function(i,o) {
            ls.push(o);
        });
        return ls.map(l => this._layerToObject(l)).reduce((map,l) => {
            map[l.name] = l;
            return map;
        },{});
    }
    private _layerToObject(layer):WmsLayerDefinition {
        let l = $jq(layer),
            o = {
                name: l.find('Name').first().text(),
                // redmine #761
                title: l.find('Title').first().text().replace(/\((.+?)\)/g, ''),
                abstract: l.find('Abstract').first().text(),
                bbox: this._parseBoundingBox(l.find('EX_GeographicBoundingBox').first()),
                style: this._parseStyle(l.find('Style').first()),
                extent: this._parseExtent(l.find('Extent').first()) // TODO see unmigrated code below
            };
        if(!o.bbox) {
            o.bbox = this._parseLatLonBoundingBox(l.find('LatLonBoundingBox').first());
        }
        return o;
    }
    private _parseStyle(style):WmsLayerStyle {
        let s = $jq(style);
        return {
            name: s.find('Name').first().text(),
            // redmine #761
            title: s.find('Title').first().text().replace(/\((.+?)\)/g, ''),
            legend: s.find('OnlineResource').attr('xlink:href') // not very specific...
        };
    }
    private _parseLatLonBoundingBox(bb) {
        if(bb.length) {
            let bbox = {
                westBoundLongitude: parseFloat(bb.attr('minx')),
                eastBoundLongitude: parseFloat(bb.attr('maxx')),
                southBoundLatitude: parseFloat(bb.attr('miny')),
                northBoundLatitude: parseFloat(bb.attr('maxy')),
                getBounds: function() { // TODO, cut/paste
                    return new google.maps.LatLngBounds(
                        new google.maps.LatLng(bbox.southBoundLatitude,bbox.westBoundLongitude), // sw
                        new google.maps.LatLng(bbox.northBoundLatitude,bbox.eastBoundLongitude) // ne
                    );
                }
            };
            return bbox;
        }
    }
    private _parseBoundingBox(bb):WmsLayerBoundingBox {
        if(bb.length) {
            let bbox = {
                westBoundLongitude: parseFloat(bb.find('westBoundLongitude').text()),
                eastBoundLongitude: parseFloat(bb.find('eastBoundLongitude').text()),
                southBoundLatitude: parseFloat(bb.find('southBoundLatitude').text()),
                northBoundLatitude: parseFloat(bb.find('northBoundLatitude').text()),
                getBounds: function() {
                    return new google.maps.LatLngBounds(
                        new google.maps.LatLng(bbox.southBoundLatitude,bbox.westBoundLongitude), // sw
                        new google.maps.LatLng(bbox.northBoundLatitude,bbox.eastBoundLongitude) // ne
                    );
                }
            };
            // some bounding boxes seem to be messed up with lat/lons of 0 && -1
            // so if any of those numbers occur throw away the bounding box.
            return ![bbox.westBoundLongitude,bbox.eastBoundLongitude,bbox.southBoundLatitude,bbox.northBoundLatitude].reduce(function(v,n){
                return v||(n === 0 || n === -1);
            },false) ? bbox : undefined;
        }
    }
    // represents an extent value of month/day/year
    private _dateExtentValue(value:string,dateFmt?:string):WmsLayerExtentValue {
        const d = parseExtentDate(value);
        return {
            value: value,
            date: d,
            label: this.griddedPipes.get('date').transform(d,(dateFmt||'longDate')),
            addToWmsParams: function(params) {
                params.time = value;
            },
            addToWcsParams: function(params) {
                if(!params.subset) {
                    params.subset = [];
                }
                params.subset.push('http://www.opengis.net/def/axis/OGC/0/time("'+value+'")');
            }
        };
    }
    // represents an extent value of day of year
    private _doyExtentValue(value:string):WmsLayerExtentValue {
        return {
            value: value,
            label: this.griddedPipes.get('thirtyYearAvgDayOfYear').transform(value),
            addToWmsParams: function(params) {
                params.elevation = value;
            },
            addToWcsParams: function(params) {
                if(!params.subset) {
                    params.subset = [];
                }
                params.subset.push('http://www.opengis.net/def/axis/OGC/0/elevation('+value+')');
            }
        };
    }
    private _parseExtent(extent):WmsLayerExtent {
        var e = $jq(extent),
            content = e.text(),
            dfltValue = e.attr('default'),
            dflt,values,
            name = e.attr('name'),
            start,end,yearFmt = 'yyyy',i;
        if(!name || !content) {
            return undefined;
        }
        function findDefault(current,value) {
            return current||(value.value == dfltValue ? value : undefined);
        }
        if(name === 'time') {
            if(content.indexOf('/') === -1) { // for now skip <lower>/<upper>/<resolution>
                values = content.split(',').map(d => this._dateExtentValue(d));
                // ugh
                dfltValue = dfltValue.replace(/0Z/,'0.000Z'); // extent values in ms preceision but not the default...
                dflt = values.reduce(findDefault,undefined);
                return {
                    label: 'Date',
                    type: WmsLayerExtentType.DATE,
                    current: dflt, // bind the extent value to use here
                    values: values
                };
            } else {
                values = /^([^\/]+)\/(.*)\/P1Y$/.exec(content);
                if(values && values.length === 3) {
                    start = this._dateExtentValue(values[1],yearFmt);
                    end = this._dateExtentValue(values[2],yearFmt);
                    if(end.date.getFullYear() > start.date.getFullYear()) { // should never happen but to be safe
                        values = [start];
                        for(i = start.date.getFullYear()+1; i < end.date.getFullYear();i++) {
                            values.push(this._dateExtentValue(i+'-01-01T00:00:00.000Z',yearFmt));
                        }
                        values.push(end);
                        return {
                            label: 'Year',
                            type: WmsLayerExtentType.YEAR,
                            current: end,
                            values: values
                        };
                    }
                }
            }
        } else if (name === 'elevation') {
            values = content.split(',').map(e => this._doyExtentValue(e));
            dflt = values.reduce(findDefault,undefined);
            return {
                label: 'Day of Year',
                type: WmsLayerExtentType.DOY,
                current: dflt, // bind the extent value to use here
                values: values
            };
        }
    }
}
