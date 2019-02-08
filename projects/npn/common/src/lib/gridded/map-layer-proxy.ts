import { MapLayer } from './map-layer';
import { NpnMapLayerService } from './npn-map-layer.service';
import { MapLayerLegend } from './map-layer-legend';

/**
 * This is a MapLayer implementation that behaves externally
 * just like a normal MapLayer except that it wraps another
 * MapLayer instance.  This allows for consolidation of similar
 * MapLayers under a single object.
 * 
 * The `setLayerName` method must be called to populate the
 * underlying layer instance.
 */
export class MapLayerProxy extends MapLayer {
    protected _proxiedLayer:MapLayer;

    constructor(
        protected map:google.maps.Map,
        protected layerService:NpnMapLayerService
    ) {
        super(map,null,layerService);
    }

    get proxiedLayer():MapLayer { return this._proxiedLayer; }

    setProxiedLayer(layerName:string):Promise<MapLayer> {
        this.layer_def = null;
        if(this._proxiedLayer) {
            this._proxiedLayer.off();
            this._proxiedLayer = null;
        }
        return layerName
            ? this.layerService.newLayer(this.map,layerName)
                .then(layer => {
                    this._proxiedLayer = layer;
                    this._proxiedLayer.setOpacity(this.opacity);
                    this.layer_def = this._proxiedLayer.layerDefinition;
                    return this._proxiedLayer;
                })
            : Promise.resolve(null);
    }

    setOpacity(opacity:number) {
        this.opacity = opacity;
        if(this._proxiedLayer) {
            this._proxiedLayer.setOpacity(opacity);
        }
    }

    on():MapLayer {
        if(this._proxiedLayer) {
            this._proxiedLayer.on();
        }
        return this;
    }

    off():MapLayer {
        if(this._proxiedLayer) {
            this._proxiedLayer.off();
        }
        return this;
    }

    bounce():MapLayer {
        return this.off().on();
    }

    /*getLegend():Promise<MapLayerLegend> {
        return this.layer_def
            ? this.layerService.getLegend(this.layer_def)
                .then(legend => legend.setLayer(this._proxiedLayer))
            : Promise.resolve(null);
    }*/
}