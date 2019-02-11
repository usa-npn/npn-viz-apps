import { BOX_SIZE, BASE_WMS_ARGS, MapLayerDefinition, MapLayerServiceType } from './gridded-common';
import { NpnMapLayerService } from './npn-map-layer.service';
import { MapLayer, srsConversion, encodeHttpParams } from './map-layer';
import * as $jq_ from 'jquery';
const $jq = $jq_;

export class WmsMapLayer extends MapLayer {
    private wmsArgs: any;
    private sldBody: any;
    private styleRange: number[];
    googleLayer: google.maps.ImageMapType;
    //[x: string]: any; // allow arbitrary properties

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
        this.googleLayer.setOpacity(this.opacity);
    }
    setOpacity(opacity:number) {
        this.opacity = opacity;
        if(this.googleLayer) {
            this.googleLayer.setOpacity(opacity);
        }
    }
    on(): WmsMapLayer {
        //TODO Analytics.trackEvent('gridded-layer','on',this.title);
        this.map.overlayMapTypes.push(this.googleLayer);
        return this;
    }
    off(): WmsMapLayer {
        if (this.map.overlayMapTypes.getLength()) {
            //TODO Analytics.trackEvent('gridded-layer','off',this.title);
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

    /**
     * Sets the style to pass to the WMS service, used to limit the layer to a range.
     * 
     * @param style The new style (XML as a stirng)
     */
    setStyle(style:any) {
        if(style !== this.sldBody) { // avoid off/on if nothing is changing
            if(style) {
                console.debug('style:',style);
            }
            this.sldBody = style;
            this.bounce();
        }
    }

    /**
     * @returns The style range if any was set.
     */
    getStyleRange():number[] {
        return this.styleRange;
    }

    /**
     * Sets the style range to pass along to the server.
     * 
     * @param range The new style range.
     */
    setStyleRange(range:number[]):Promise<void> {
        if(!(this.styleRange = range)) {
            this.setStyle(undefined);
            return Promise.resolve();
        }
        return this.getLegend().then(legend => {
            const styleDef = legend.getStyleDefinition(),
                data = legend.getData(),
                minQ = data[range[0]].quantity,
                maxQ = data[range[1]].quantity,
                $styleDef = $jq(styleDef);
            let colors = $styleDef.find('ColorMapEntry');
            let colorMap = $styleDef.find('ColorMap');
            // only want the first style assosiated with the layer
            // todo: instead of picking first style, generalize to pick by name
            while (styleDef[0].firstElementChild.firstElementChild.children.length > 2) {
                styleDef[0].firstElementChild.firstElementChild.removeChild(styleDef[0].firstElementChild.firstElementChild.lastChild);
            }    
            if(colors.length === 0) {
                colors = $styleDef.find('sld\\:ColorMapEntry'); // FF
            }
            if(colorMap.length === 0) {
                colorMap = $styleDef.find('sld\\:ColorMap'); // FF
            }
            if(colorMap) {
                colorMap.attr('type','intervals');
            }
            colors.each(function() {
                var cme = $jq(this),
                    q = parseInt(cme.attr('quantity'));
                /*if(q === -9999) {
                    cme.attr('opacity','0.0');
                    //cme.remove();
                } else {*/
                    cme.attr('opacity',(q > minQ && q <= maxQ) ? '1.0' : '0.0');
                /*}*/
            });
            this.setStyle(xmlToString(styleDef[0]));
        });
    }
}


function xmlToString(xmlData) {
    let xmlString;
    if ((window as any).ActiveXObject) {
        xmlString = xmlData.xml; // MSIE
    } else {
        xmlString = (new XMLSerializer()).serializeToString(xmlData);
    }
    return xmlString;
}