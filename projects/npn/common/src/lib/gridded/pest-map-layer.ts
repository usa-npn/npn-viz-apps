import { MapLayerDefinition, MapLayerExtentType, MapLayerServiceType, MapLayerExtentValue } from './gridded-common';
import { NpnMapLayerService } from './npn-map-layer.service';
import { MapLayer } from './map-layer';
import { ONE_DAY_MILLIS } from '../visualizations/vis-selection';

export class PestMapLayer extends MapLayer {
    private overlay: google.maps.GroundOverlay;
    constructor(protected map: google.maps.Map, protected layer_def: MapLayerDefinition, protected layerService: NpnMapLayerService) {
        super(map, layer_def, layerService);
        const currentValue = this.newExtentValue(new Date()).value;
        const minDateMillis = new Date(new Date().getFullYear() - 1, 0, 1).getTime();
        const maxDateMillis = new Date(new Date().getTime() + (6*ONE_DAY_MILLIS)).getTime();
        const values = [];
        let cMillis = minDateMillis;
        while(cMillis <= maxDateMillis) {
            const d = new Date(cMillis);
            values.push(this.newExtentValue(d));
            cMillis += ONE_DAY_MILLIS;
        }
        layer_def.extent = {
            current: values.reduce((found,v) => found||(v.value === currentValue ? v : undefined),undefined),
            label: 'Date',
            type: MapLayerExtentType.DATE,
            values
        };

        console.log('PestMapLayer.extnet',layer_def.extent);
    }
    newExtentValue(date: Date): MapLayerExtentValue {
        date.setHours(0, 0, 0, 0);
        const value = date.toISOString().replace(/T.*Z$/,'T00:00:00.000Z');
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
        //TODO Analytics.trackEvent('gridded-layer','on',this.title);
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
        //TODO Analytics.trackEvent('gridded-layer','off',this.title);
        return this._off();
    }
    bounce(): PestMapLayer {
        return this._off()._on();
    }
}
