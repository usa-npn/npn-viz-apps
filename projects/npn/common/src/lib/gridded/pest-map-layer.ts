import { MapLayerDefinition, MapLayerExtentType, MapLayerServiceType, MapLayerExtentValue } from './gridded-common';
import { NpnMapLayerService } from './npn-map-layer.service';
import { MapLayer } from './map-layer';
export class PestMapLayer extends MapLayer {
    private overlay: google.maps.GroundOverlay;
    constructor(protected map: google.maps.Map, protected layer_def: MapLayerDefinition, protected layerService: NpnMapLayerService) {
        super(map, layer_def, layerService);
        layer_def.extent = {
            current: this.newExtentValue(new Date()),
            label: 'Date',
            type: MapLayerExtentType.DATE,
        };
        // the original created a scoped object and copied all the layer_def properties onto it and
        // added the functions to that, copy the properties onto the WmsMapLayer instance
        Object.keys(layer_def).forEach(key => {
            this[key] = layer_def[key];
        });
    }
    newExtentValue(date: Date): MapLayerExtentValue {
        date.setHours(0, 0, 0, 0);
        const value = date.toISOString();
        return {
            value,
            date,
            label: `${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}`,
            addToParams(params: any, serviceType: MapLayerServiceType): void {
                switch (serviceType) {
                    case MapLayerServiceType.WMS:
                        params.date = value.substring(0, 10);
                        break;
                    case MapLayerServiceType.WCS:
                        console.warn('TODO pest map args to WCS requests');
                        break;
                }
            }
        };
    }
    setOpacity(opacity:number) {
        this.opacity = opacity;
        if(this.overlay) {
            this.overlay.setOpacity(opacity);
        }
    }
    private _on(): PestMapLayer {
        const params: any = {
            species: this.layer_def.title
        };
        this.layer_def.extent.current.addToParams(params, MapLayerServiceType.WMS);
        this.layerService.serviceUtils.get(this.layerService.serviceUtils.dataApiUrl('/v0/agdd/pestMap'), params).then(response => {
            const { bbox, clippedImage } = response;
            const [west, south, east, north] = bbox;
            this.overlay = new google.maps.GroundOverlay(clippedImage, { north, south, east, west }, { clickable: false });
            // TODO maybe control opacity generically??
            this.overlay.setOpacity(this.opacity);
            this.overlay.setMap(this.map);
        });
        return this;
    }
    on(): PestMapLayer {
        //TODO Analytics.trackEvent('gridded-layer','on',this.getTitle());
        return this._on();
    }
    private _off(): PestMapLayer {
        if (this.overlay) {
            this.overlay.setMap(null);
            this.overlay = null;
        }
        return this;
    }
    off(): PestMapLayer {
        //TODO Analytics.trackEvent('gridded-layer','off',this.getTitle());
        return this._off();
    }
    bounce(): PestMapLayer {
        return this._off()._on();
    }
}
