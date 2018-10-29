import {BOX_SIZE,BASE_WMS_ARGS} from './gridded-common';

// this is incomplete (obviously).  after starting down this path
// realized that WmsMapLegend could be migrated without Layer which isn't initially needed
// leaving the current state of things as is.
// this will compile but is useless...
function $filter(name:string):any {}

export class WmsMapLayer {
    private wmsArgs:any;
    private sldBody:any;
    googleLayer: google.maps.ImageMapType;
    [x: string]: any; // allow arbitrary properties

    constructor(protected map:google.maps.Map,protected layer_def:any,protected wmsBaseUrl:string) {
        if(layer_def.extent_values_filter) {
            console.debug('layer '+layer_def.name+' has an extent_values_filter, processing',layer_def.extent_values_filter);
            let valuesFilter = $filter(layer_def.extent_values_filter.name),
                extentValues = layer_def.extent.values.map(function(e){ return e.value; }),
                filterArgs = [extentValues].concat(layer_def.extent_values_filter.args||[]),
                filteredValues;
            filteredValues = valuesFilter.apply(undefined,filterArgs);
            console.debug('filteredValues',(filteredValues.length > 1 ? (filteredValues[0]+'...'+filteredValues[filteredValues.length-1]) : filteredValues));
            layer_def.extent.values = layer_def.extent.values.filter(function(v) {
                return filteredValues.indexOf(v.value) !== -1;
            });
            if(layer_def.extent.current && filteredValues.indexOf(layer_def.extent.current.value) === -1) {
                console.debug('current extent value has become invalid, replacing with last option');
                layer_def.extent.current = layer_def.extent.values.length ? layer_def.extent.values[layer_def.extent.values.length-1] : undefined;
            }
        }
        if(layer_def.extent_default_filter) {
            console.debug('layer '+layer_def.name+' has an extent_default_filter, processing', layer_def.extent_default_filter);
            let defaultFilter = $filter(layer_def.extent_default_filter.name),
                defaultFilterArgs = [layer_def.extent.values].concat(layer_def.extent_default_filter.values||[]);
            layer_def.extent.current = defaultFilter.apply(undefined,defaultFilterArgs)||layer_def.extent.current;
            console.debug('resulting default value',layer_def.extent.current);
        }
        /*
        if(layer_def.description) {
            layer_def.$description = $sce.trustAsHtml(layer_def.description);
        }*/
        this.wmsArgs = {...BASE_WMS_ARGS,...{layers: layer_def.name}};
        this.googleLayer = new google.maps.ImageMapType({
            getTileUrl: (coord:google.maps.Point, zoom:number) => {
                let proj = map.getProjection(),
                    zfactor = Math.pow(2, zoom),
                    top = proj.fromPointToLatLng(new google.maps.Point(coord.x * BOX_SIZE / zfactor, coord.y * BOX_SIZE / zfactor)),
                    bot = proj.fromPointToLatLng(new google.maps.Point((coord.x + 1) * BOX_SIZE / zfactor, (coord.y + 1) * BOX_SIZE / zfactor)),
                    ctop = srsConversion(top),
                    cbot = srsConversion(bot),
                    base = {};
                if(this.extent && this.extent.current) {
                    this.extent.current.addToWmsParams(base);
                }
                var args:any = {bbox: [ctop.lng,cbot.lat,cbot.lng,ctop.lat].join(',')};
                if(this.sldBody) {
                    args.sld_body = this.sldBody;
                }
                let all_args = {...base,...this.wmsArgs,...args};
                return this.wmsBaseUrl+'?'+encodeHttpParams(all_args);
            },
            tileSize: new google.maps.Size(BOX_SIZE, BOX_SIZE),
            //isPng: true,
            name: (layer_def.title||layer_def.name)
        });
        // the original created a scoped object and copied all the layer_def properties onto it and
        // added the functions to that, copy the properties onto the WmsMapLayer instance
        Object.keys(layer_def).forEach(key => {
            this[key] = layer_def[key];
        });
    }
}

function encodeHttpParams(params) {
    if(!params) {
        return '';
    }
    let parts = [];
    Object.keys(params).forEach(k => {
        if(params[k]) {
            let ok = encodeURIComponent(k),
                ov = encodeURIComponent(params[k]);
            parts.push(`${ok}=${ov}`);
        }
    });
    return parts.join('&');
}

// this code converts coordinates from ESPG:4326 to ESPG:3857, it originated @
// http://gis.stackexchange.com/questions/52188/google-maps-wms-layer-with-3857
// that author stated it came from StackOverflow which I tried to find to attribute properly but could not.
// the issue here is that if requests are sent to the map service with ESPG:4326 coordinates everything
// appears accurate when tightly zoomed however as you zoom out beyond a certain point the layers begin to
// migrate north, the farther zoomed out the more drastic the migration (e.g. from Mexico into N. Canada)
// while dealing in traditional lat/lng for google maps they are actually projected in 3857 (metres, not meters).
// the main thing is that 4326 coordinates are projected onto a sphere/ellipsoid while 3857 are translated to
// a flat surface.
// unfortunately while google maps projection must be performing such transformations it doesn't expose this ability.
function srsConversion(latLng) {
    if ((Math.abs(latLng.lng()) > 180 || Math.abs(latLng.lat()) > 90)) {
        return;
    }

    var num = latLng.lng() * 0.017453292519943295;
    var x = 6378137.0 * num;
    var a = latLng.lat() * 0.017453292519943295;

    return {lng: x, lat: 3189068.5 * Math.log((1.0 + Math.sin(a)) / (1.0 - Math.sin(a)))};
}
