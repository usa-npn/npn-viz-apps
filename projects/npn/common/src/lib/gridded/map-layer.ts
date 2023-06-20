import {MapLayerDefinition, GriddedUrls, MapLayerType, MapLayerExtent, MapLayerExtentType} from './gridded-common';
import { GriddedPipeProvider } from './pipes';
import { NpnMapLayerService } from './npn-map-layer.service';
import { MapLayerLegend } from './map-layer-legend';
import { SupportsOpacity } from './supports-opacity-control.component';

export abstract class MapLayer implements SupportsOpacity {
    protected griddedPipes:GriddedPipeProvider;
    protected griddedUrls:GriddedUrls;
    protected opacity:number = 0.75;

    constructor(
        protected map:google.maps.Map,
        protected layer_def:MapLayerDefinition,
        protected layerService:NpnMapLayerService
    ) {
        this.griddedPipes = layerService.griddedPipes;
        this.griddedUrls = layerService.griddedUrls;
    }

    /**
     * Callers are responsible for turning a layer off
     * before switching the underlying map and turning it back on.
     * 
     * @param map The new map.
     */
    setMap(map:google.maps.Map) {
        this.map = map;
    }

    getMap():google.maps.Map {
        return this.map;
    }

    get layerDefinition():MapLayerDefinition { return this.layer_def; }

    get layerBasis():string {
        if (this.layerName == "precipitation:buffelgrass_prism" 
        || this.layerName == "gdd:winter_wheat"
        || this.layerName == "gdd:eab_adult"
        || this.layerName == "gdd:eab_egg_hatch"
        || this.layerName == "gdd:red_brome_flowering"
        || this.layerName == "gdd:red_brome_senescence")
            return this.layerName;
        return this.layer_def && this.layer_def.layerBasis
            ? this.layer_def.layerBasis
            : this.layerName;
    }
    get layerName():string {
        return this.layer_def
            ? this.layer_def.name
            : null;
    }
    get layerType():MapLayerType {
        return  this.layer_def && this.layer_def.type
            ? this.layer_def.type
            : MapLayerType.STANDARD;
    }
    get extent():MapLayerExtent {
        return this.layer_def
            ? this.layer_def.extent
            : null;
    }
    get extentType():MapLayerExtentType { 
        return (this.layer_def && this.layer_def.extent)
            ? this.layer_def.extent.type
            : null;
    }
    get title():string {
        return (this.layer_def && this.layer_def.title)
            ? this.layer_def.title // this.layer_def.title.replace(/^(.*?)\s+-\s+(.*)$/,'$2')
            : undefined;
    }

    hasAbstract() {
        return this.layer_def
            ? !!this.layer_def.abstract
            : false;
    }

    getAbstract() {
        return (this.layer_def && this.layer_def.abstract)
            ? this.layer_def.abstract.replace(/\s*developer notes.*$/i,'')
            : undefined;
    }
    
    getLegend():Promise<MapLayerLegend> {
        return this.layer_def
            ? this.layerService.getLegend(this.layer_def)
                .then(legend => legend.setLayer(this))
            : Promise.resolve(null);
    }

    /**
     * Sets the current opacity (0-1) for this layer.
     * Sub-classes will over-ride to pass along the value
     */
    setOpacity(opacity:number) { this.opacity = opacity; }
    /** Gets the current opacity for this layer. */
    getOpacity():number { return this.opacity; }

    /** Turn the layer on. */
    abstract on():MapLayer;
    /** Then the layer off. */
    abstract off():MapLayer;
    /** Called when a layer's current extent changes to update the layer in place. */
    abstract bounce():MapLayer;
}

// NOTE: this function replaces all encoded spaces (%20) with '+'
// this is perhaps a kludge solution to the fact that %20 is three chars while + is one
// and for some map layers sending a value for sld_body using %20 can result in
// overflowing the maximum length of a URI breaking thos emaps.  This is a simple 
// workaround to that issue.
export function encodeHttpParams(params) {
    if(!params) {
        return '';
    }
    let parts = [];
    Object.keys(params).forEach(k => {
        if(params[k]) {
            let ok = encodeURIComponent(k),
                ov = encodeURIComponent(params[k]).replace(/%20/g,'+');
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
