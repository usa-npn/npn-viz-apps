import {MapLayerDefinition, GriddedUrls, MapLayerType} from './gridded-common';
import { GriddedPipeProvider } from './pipes';
import { NpnMapLayerService } from './npn-map-layer.service';
import { MapLayerLegend } from './map-layer-legend';

export abstract class MapLayer {
    protected griddedPipes:GriddedPipeProvider;
    protected griddedUrls:GriddedUrls;

    constructor(
        protected map:google.maps.Map,
        protected layer_def:MapLayerDefinition,
        protected layerService:NpnMapLayerService
    ) {
        this.griddedPipes = layerService.griddedPipes;
        this.griddedUrls = layerService.griddedUrls;
    }

    get layerName():string { return this.layer_def.name; }

    getLegend():Promise<MapLayerLegend> {
        return this.layerService.getLegend(this.layer_def)
            .then(legend => legend.setLayer(this))
    }

    /** Turn the layer on. */
    abstract on():MapLayer;
    /** Then the layer off. */
    abstract off():MapLayer;
    /** Called when a layer's current extent changes to update the layer in place. */
    abstract bounce():MapLayer;
}

export function encodeHttpParams(params) {
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
export function srsConversion(latLng) {
    if ((Math.abs(latLng.lng()) > 180 || Math.abs(latLng.lat()) > 90)) {
        return;
    }

    var num = latLng.lng() * 0.017453292519943295;
    var x = 6378137.0 * num;
    var a = latLng.lat() * 0.017453292519943295;

    return {lng: x, lat: 3189068.5 * Math.log((1.0 + Math.sin(a)) / (1.0 - Math.sin(a)))};
}
