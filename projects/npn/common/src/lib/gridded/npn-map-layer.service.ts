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
    MapLayerDefs,
    MapLayerDefinition,
    parseExtentDate,
    MapLayerExtentValue,
    MapLayerExtent,
    MapLayerBoundingBox,
    MapLayerStyle,
    MapLayerExtentType,
    WMS_VERSION,
    MapLayerType,
    MapLayerServiceType
} from './gridded-common';
import { MapLayer } from './map-layer';
import { PestMapLayer } from "./pest-map-layer";
import { WmsMapLayer } from "./wms-map-layer";
import { GriddedPipeProvider } from './pipes';
import { MapLayerLegend } from './map-layer-legend';
import { PestMapLayerLegend } from "./pest-map-layer-legend";
import { WmsMapLayerLegend } from "./wms-map-layer-legend";

const DEEP_COPY = (o) => JSON.parse(JSON.stringify(o));

@Injectable()
export class NpnMapLayerService {
    private legends:any = {};
    private layerDefs:any;

    constructor(
        public serviceUtils:NpnServiceUtils,
        public griddedPipes:GriddedPipeProvider,
        public griddedUrls:GriddedUrls
    ) {}

    newLayer(map:google.maps.Map,layerName:string):Promise<MapLayer> {
        return this.getLayerDefinition(layerName)
            .then(layerDef => {
                if(layerDef) {
                    switch(layerDef.type||MapLayerType.STANDARD) {
                        case MapLayerType.STANDARD:
                            return new WmsMapLayer(map,layerDef,this);
                        case MapLayerType.PEST:
                            return new PestMapLayer(map,layerDef,this);
                    }
                }
            });
    }

    // this is separate from WmsLayer itself because FWS apps use
    // legends separate from layers (for now).  If the clipped stuff
    // is worked into a sub-class of NpnMapLayer then this should likely
    // move into the layer implementation itself.
    getLegend(input:MapLayerDefinition | string):Promise<MapLayerLegend> {
        const definition:Promise<MapLayerDefinition> = typeof(input) === 'string'
            ? this.getLayerDefinition(input as string)
            : Promise.resolve(input as MapLayerDefinition);
        return definition.then(layerDef => {
            const layerBasis = layerDef.layerBasis;
            const layerName = layerDef.name;
            if(this.legends[layerName]) {
                return Promise.resolve(this.legends[layerName]);
            }
            return this.serviceUtils.cachedGet(this.griddedUrls.wmsBaseUrl,{
                    service: 'wms',
                    request: 'GetStyles',
                    version: WMS_VERSION,
                    layers: layerBasis||layerName
                },true /* as text*/)
                .then(xml => {
                    const legend_data = $jq($jq.parseXML(xml));
                    const findChildren = (tagName,jqParent) => {
                        let found = jqParent.find(tagName);
                        return found.length === 0
                            ? jqParent.find('sld\\:'+tagName) // FF
                            : found;
                    };
                    const userStyles = findChildren('UserStyle',legend_data);
                    const userStyleElm = !!layerBasis
                        ? userStyles.toArray().reduce((found,e) => {
                                if(found) {
                                    return found;
                                }
                                const styleName = findChildren('Name',$jq(e)).first().text();
                                return styleName === layerName ? e : null;
                            },null)
                        : userStyles.toArray()[0]; 
                    let color_map = findChildren('ColorMap',$jq(userStyleElm));
                    let l:MapLayerLegend;
                    if(color_map.length !== 0) {
                        switch(layerDef.type||MapLayerType.STANDARD) {
                            case MapLayerType.STANDARD:
                                l = new WmsMapLayerLegend(this.griddedPipes,
                                    $jq(color_map.toArray()[0]),
                                    layerDef,
                                    legend_data);
                                break;
                            case MapLayerType.PEST:
                                l = new PestMapLayerLegend(this.griddedPipes,
                                    $jq(color_map.toArray()[0]),
                                    layerDef,
                                    legend_data);
                                break;
                        }
                    }
                    return this.legends[layerName] = l;
                });
        });
    }

    getLayerDefinitions():Promise<MapLayerDefs> {
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

    getLayerDefinition(layerName:string):Promise<MapLayerDefinition> {
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
    private _getLayers(layers):({[name:string]: MapLayerDefinition}) {
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
    private _layerToObject(layer):MapLayerDefinition {
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
    private _parseStyle(style):MapLayerStyle {
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
    private _parseBoundingBox(bb):MapLayerBoundingBox {
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
    private _dateExtentValue(value:string,dateFmt?:string):MapLayerExtentValue {
        const d = parseExtentDate(value);
        return {
            value: value,
            date: d,
            label: this.griddedPipes.get('date').transform(d,(dateFmt||'longDate')),
            addToParams: function(params:any,serviceType:MapLayerServiceType):void {
                switch(serviceType) {
                    case MapLayerServiceType.WMS:
                        params.time = value;
                        break;
                    case MapLayerServiceType.WCS:
                        params.subset = params.subset||[];
                        params.subset.push(`http://www.opengis.net/def/axis/OGC/0/time("${value}")`);
                        break;
                }
            }
        };
    }
    // represents an extent value of day of year
    private _doyExtentValue(value:string):MapLayerExtentValue {
        return {
            value: value,
            label: this.griddedPipes.get('thirtyYearAvgDayOfYear').transform(value),
            addToParams: function(params:any,serviceType:MapLayerServiceType):void {
                switch(serviceType) {
                    case MapLayerServiceType.WMS:
                        params.elevation = value;
                        break;
                    case MapLayerServiceType.WCS:
                        params.subset = params.subset||[];
                        params.subset.push(`http://www.opengis.net/def/axis/OGC/0/elevation(${value})`);
                        break;
                }
            }
        };
    }
    private _parseExtent(extent):MapLayerExtent {
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
                    type: MapLayerExtentType.DATE,
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
                            type: MapLayerExtentType.YEAR,
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
                type: MapLayerExtentType.DOY,
                current: dflt, // bind the extent value to use here
                values: values
            };
        }
    }
}
