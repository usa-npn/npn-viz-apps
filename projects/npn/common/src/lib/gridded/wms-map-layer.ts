import { BOX_SIZE, BASE_WMS_ARGS, MapLayerDefinition, MapLayerServiceType } from './gridded-common';
import { NpnMapLayerService } from './npn-map-layer.service';
import { MapLayer, srsConversion, encodeHttpParams } from './map-layer';

export class WmsMapLayer extends MapLayer {
    private wmsArgs: any;
    private sldBody: any;
    googleLayer: google.maps.ImageMapType;
    [x: string]: any; // allow arbitrary properties
    constructor(protected map: google.maps.Map, protected layer_def: MapLayerDefinition, protected layerService: NpnMapLayerService) {
        super(map, layer_def, layerService);
        if (layer_def.extent_values_filter) {
            console.debug('layer ' + layer_def.name + ' has an extent_values_filter, processing', layer_def.extent_values_filter);
            const valuesPipe = this.griddedPipes.get(layer_def.extent_values_filter.name), extentValues = layer_def.extent.values.map(e => e.value), filterArgs = [extentValues].concat(layer_def.extent_values_filter.args || []), filteredValues = valuesPipe.transform.apply(valuesPipe, filterArgs);
            console.debug('filteredValues', (filteredValues.length > 1 ? (filteredValues[0] + '...' + filteredValues[filteredValues.length - 1]) : filteredValues));
            layer_def.extent.values = layer_def.extent.values.filter(function (v) {
                return filteredValues.indexOf(v.value) !== -1;
            });
            if (layer_def.extent.current && filteredValues.indexOf(layer_def.extent.current.value) === -1) {
                console.debug('current extent value has become invalid, replacing with last option');
                layer_def.extent.current = layer_def.extent.values.length ? layer_def.extent.values[layer_def.extent.values.length - 1] : undefined;
            }
        }
        if (layer_def.extent_default_filter) {
            console.debug('layer ' + layer_def.name + ' has an extent_default_filter, processing', layer_def.extent_default_filter);
            let defaultPipe = this.griddedPipes.get(layer_def.extent_default_filter.name), defaultFilterArgs = [layer_def.extent.values].concat(layer_def.extent_default_filter.values || []);
            layer_def.extent.current = defaultPipe.transform.apply(defaultPipe, defaultFilterArgs) || layer_def.extent.current;
            console.debug('resulting default value', layer_def.extent.current);
        }
        /*
        if(layer_def.description) {
            layer_def.$description = $sce.trustAsHtml(layer_def.description);
        }*/
        this.wmsArgs = { ...BASE_WMS_ARGS, ...{ layers: layer_def.name } };
        this.googleLayer = new google.maps.ImageMapType({
            getTileUrl: (coord: google.maps.Point, zoom: number) => {
                let proj = map.getProjection(), zfactor = Math.pow(2, zoom), top = proj.fromPointToLatLng(new google.maps.Point(coord.x * BOX_SIZE / zfactor, coord.y * BOX_SIZE / zfactor)), bot = proj.fromPointToLatLng(new google.maps.Point((coord.x + 1) * BOX_SIZE / zfactor, (coord.y + 1) * BOX_SIZE / zfactor)), ctop = srsConversion(top), cbot = srsConversion(bot), base = {};
                if (this.extent && this.extent.current) {
                    this.extent.current.addToParams(base, MapLayerServiceType.WMS);
                }
                var args: any = { bbox: [ctop.lng, cbot.lat, cbot.lng, ctop.lat].join(',') };
                if (this.sldBody) {
                    args.sld_body = this.sldBody;
                }
                let all_args = { ...base, ...this.wmsArgs, ...args };
                return this.griddedUrls.wmsBaseUrl + '?' + encodeHttpParams(all_args);
            },
            tileSize: new google.maps.Size(BOX_SIZE, BOX_SIZE),
            //isPng: true,
            name: (layer_def.title || layer_def.name)
        });
        // the original created a scoped object and copied all the layer_def properties onto it and
        // added the functions to that, copy the properties onto the WmsMapLayer instance
        Object.keys(layer_def).forEach(key => {
            this[key] = layer_def[key];
        });
    }
    /**
     * @returns {google.maps.Map} The map instance.
     *
    getMap():google.maps.Map {
        return this.map;
    }*/
    // TODO there are quite a lot of other functions that may need to come over.
    on(): WmsMapLayer {
        //TODO Analytics.trackEvent('gridded-layer','on',this.getTitle());
        this.map.overlayMapTypes.push(this.googleLayer);
        return this;
    }
    off(): WmsMapLayer {
        if (this.map.overlayMapTypes.getLength()) {
            //TODO Analytics.trackEvent('gridded-layer','off',this.getTitle());
            this.map.overlayMapTypes.pop();
        }
        // TODO deal with pest map which is a google.maps.GroundOverlay
        return this;
    }
    bounce(): WmsMapLayer {
        if (this.map.overlayMapTypes.getLength()) {
            this.map.overlayMapTypes.pop();
        }
        this.map.overlayMapTypes.push(this.googleLayer);
        return this;
    }
}
