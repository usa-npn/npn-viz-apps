import {Injectable} from '@angular/core';
import * as $jq_ from 'jquery';
const $jq = $jq_;

import {DateExtentUtil} from './date-extent-util.service';
import {NpnServiceUtils} from '../common/index';
import {MAP_LAYERS,GriddedUrls} from './gridded-common';
import {WmsMapLayer} from './wms-map-layer';

const DEEP_COPY = (o) => JSON.parse(JSON.stringify(o));

@Injectable()
export class WmsMapLayerService {
    private layerDefs:any;

    constructor(private serviceUtils:NpnServiceUtils,
                private dateExtentUtil:DateExtentUtil,
                private urls:GriddedUrls) {
    }

    getLayers(map:google.maps.Map):Promise<any> {
        return new Promise((resolve,reject) => {
            this.getLayerDefinitions()
                .then(definitions => {
                    let copy = DEEP_COPY(definitions);
                    copy.categories.forEach(cat => {
                        // replace layer definitions with actual layers
                        cat.layers = cat.layers.map(l => new WmsMapLayer(map,l,this.urls.wmsBaseUrl));
                    });
                    resolve(copy);
                })
                .catch(reject);
        });
    }

    getLayerDefinitions():Promise<any> {
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
        return new Promise((resolve,reject) => {
            if(this.layerDefs) {
                resolve(this.layerDefs);
            } else {
                this.serviceUtils.cachedGet(this.urls.wmsCapabilitiesUrl,null,true/*as text*/)
                    .then(xml => {
                        let wms_capabilities = $jq($jq.parseXML(xml));
                        console.debug('WmsMapLayerService:capabilities',wms_capabilities);
                        let wms_layer_defs = this._getLayers(wms_capabilities.find('Layer'));
                        console.debug('WmsMapLayerService:wms layer definitions',wms_layer_defs);
                        this.layerDefs = mergeLayersIntoConfig(wms_layer_defs);
                        console.debug('WmsMapLayerService:layer definitions',this.layerDefs);
                        resolve(this.layerDefs);
                    })
                    .catch(reject);
            }
        });
    }

    getLayerDefinition(layerName:string):Promise<any> {
        return new Promise((resolve,reject) => {
            this.getLayerDefinitions()
                .then(definitions => {
                    let layerMap = definitions.categories.reduce((map,c) => {
                            c.layers.forEach(l => {
                                map[l.name] = l;
                            });
                            return map;
                        },{});
                    resolve(layerMap[layerName]);
                })
                .catch(reject);
        });
    }

    // returns an associative array of machine name layer to layer definition
    private _getLayers(layers) {
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
    private _layerToObject(layer) {
        let l = $jq(layer),
            o = {
                name: l.find('Name').first().text(),
                // redmine #761
                title: l.find('Title').first().text().replace(/\((.+?)\)/g, ''),
                abstract: l.find('Abstract').first().text(),
                bbox: this._parseBoundingBox(l.find('EX_GeographicBoundingBox').first()),
                style: this._parseStyle(l.find('Style').first()),
                //extent: this._parseExtent(l.find('Extent').first()) // TODO see unmigrated code below
            };
        if(!o.bbox) {
            o.bbox = this._parseLatLonBoundingBox(l.find('LatLonBoundingBox').first());
        }
        return o;
    }
    private _parseStyle(style) {
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
    private _parseBoundingBox(bb) {
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
    /* TODO extents involve filters, etc. so this code, and the code that calls it has yet to be
     * migrated there will be a "PipeFactory" so this can be dealt with.
    // represents an extent value of month/day/year
    function DateExtentValue(value,dateFmt) {
        var d = DateExtentUtil.parse(value);
        return {
            value: value,
            date: d,
            label: $filter('date')(d,(dateFmt||'longDate')),
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
    function DoyExtentValue(value) {
        return {
            value: value,
            label: $filter('thirtyYearAvgDayOfYear')(value),
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
    function parseExtent(extent) {
        var e = $(extent),
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
                values = content.split(',').map(function(d) { return new DateExtentValue(d); });
                // ugh
                dfltValue = dfltValue.replace(/0Z/,'0.000Z'); // extent values in ms preceision but not the default...
                dflt = values.reduce(findDefault,undefined);
                return {
                    label: 'Date',
                    type: 'date',
                    current: dflt, // bind the extent value to use here
                    values: values
                };
            } else {
                values = /^([^\/]+)\/(.*)\/P1Y$/.exec(content);
                if(values && values.length === 3) {
                    start = new DateExtentValue(values[1],yearFmt);
                    end = new DateExtentValue(values[2],yearFmt);
                    if(end.date.getFullYear() > start.date.getFullYear()) { // should never happen but to be safe
                        values = [start];
                        for(i = start.date.getFullYear()+1; i < end.date.getFullYear();i++) {
                            values.push(new DateExtentValue(i+'-01-01T00:00:00.000Z',yearFmt));
                        }
                        values.push(end);
                        return {
                            label: 'Year',
                            type: 'year',
                            current: end,
                            values: values
                        };
                    }
                }
            }
        } else if (name === 'elevation') {
            values = content.split(',').map(function(e) { return new DoyExtentValue(e); });
            dflt = values.reduce(findDefault,undefined);
            return {
                label: 'Day of Year',
                type: 'doy',
                current: dflt, // bind the extent value to use here
                values: values
            };
        }
    }*/
}
