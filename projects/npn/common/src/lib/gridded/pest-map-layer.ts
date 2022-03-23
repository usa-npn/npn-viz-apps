import { MapLayerDefinition, MapLayerExtentType, MapLayerServiceType, MapLayerExtentValue } from './gridded-common';
import { NpnMapLayerService } from './npn-map-layer.service';
import { MapLayer } from './map-layer';
import { ONE_DAY_MILLIS } from '../visualizations/vis-selection';

export interface PestDescription {
    species: string;
    lowerThreshold?: number;
    upperThreshold?: number;
    base?: number;
    startMonthDay?: string;
    agddMethod?: string;
}

/**
 * Wrapper for google.maps.GroundOverlay creation/interaction to allow
 * the on/off methods of the PestMapLayer to be synchronous even though
 * the creating of the underlying GroundOverlay is asynchronous.
 * I.e. the app may want to turn "off" a layer before it's actually "on"
 */
class GroundOverlayWrapper {
    private overlayReadyResolver;
    private overlayReady:Promise<google.maps.GroundOverlay> = new Promise(resolve => this.overlayReadyResolver = resolve);
    constructor(data:Promise<any>,private opacity:number,private map:google.maps.Map) {
        data.then(response => {
            const { bbox, clippedImage } = response;
            const [west, south, east, north] = bbox;
            const overlay = new google.maps.GroundOverlay(clippedImage, { north, south, east, west }, { clickable: false });
            overlay.setOpacity(this.opacity);
            overlay.setMap(this.map);
            this.overlayReadyResolver(overlay);
        });
    }

    on() {
        this.overlayReady.then(overlay => overlay.setMap(this.map));
    }

    off() {
        this.overlayReady.then(overlay => overlay.setMap(null));
    }

    setOpacity(opacity:number) {
        this.overlayReady.then(overlay => overlay.setOpacity(this.opacity = opacity));
    }
}

export class PestMapLayer extends MapLayer {
    private overlay: GroundOverlayWrapper;
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
        console.log('PestMapLayer.extent',layer_def.extent);
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
                        params.subset = params.subset||[];
                        params.subset.push(`http://www.opengis.net/def/axis/OGC/0/time("${value}")`);
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
        let speciesName = this.layer_def.title;
        if (speciesName == 'Spongy Moth') {
            speciesName = 'Gypsy Moth';
        }
        const params: any = {
            species: speciesName
        };
        this.layer_def.extent.current.addToParams(params, MapLayerServiceType.WMS);
        this.overlay = new GroundOverlayWrapper(this.layerService.serviceUtils.get(this.layerService.serviceUtils.dataApiUrl('/v0/agdd/pestMap'), params),this.opacity,this.map);
        this.overlay.on();
        return this;
    }
    on(): PestMapLayer {
        //TODO Analytics.trackEvent('gridded-layer','on',this.title);
        return this._on();
    }
    private _off(): PestMapLayer {
        if (this.overlay) {
            this.overlay.off();
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

    getPestDescription():Promise<PestDescription> {
        let species = this.title;
        if (species == 'Spongy Moth') {
            species = 'Gypsy Moth';
        }
        return this.layerService.serviceUtils.cachedGet(
            this.layerService.serviceUtils.dataApiUrl('/v0/agdd/pestDescriptions')
        ).then((descriptions:PestDescription[]) => descriptions.find(d => d.species === species));
    }

    getTimeSeriesUrl():Promise<string> {
        return this.getPestDescription()
            .then(pest => this.layerService.serviceUtils.dataApiUrl(`/v0/agdd/${pest.agddMethod||'simple'}/pointTimeSeries`));
    }
}
