import {Injectable} from '@angular/core';
import * as $jq_ from 'jquery';
const $jq = $jq_;

import {WmsMapLayerService} from './wms-map-layer.service';
import {NpnServiceUtils} from '../common/index';
import {WmsMapLegend} from './wms-map-legend';
import {WMS_VERSION,GriddedUrls} from './gridded-common';
import { GriddedPipeProvider } from './pipes';

@Injectable()
export class WmsMapLegendService {
    legends:any = {};

    constructor(private griddedPipes:GriddedPipeProvider,
                private serviceUtils:NpnServiceUtils,
                private layerService:WmsMapLayerService,
                private urls:GriddedUrls) {
        console.warn('WmsMapLegendService: depcrecated!');
    }

    getLegend(layerName:string):Promise<WmsMapLegend> {
        if(this.legends[layerName]) {
            return Promise.resolve(this.legends[layerName]);
        }
        return this.layerService.getLayerDefinition(layerName)
            .then(layerDefinition => {
                if(!layerDefinition) {
                    throw new Error(`layer definition for ${layerName} not found.`)
                }
                return this.serviceUtils.cachedGet(this.urls.wmsBaseUrl,{
                        service: 'wms',
                        request: 'GetStyles',
                        version: WMS_VERSION,
                        layers: layerName
                    },true /* as text*/)
                    .then(xml => {
                        let legend_data = $jq($jq.parseXML(xml)),
                            color_map = legend_data.find('ColorMap');
                        if(color_map.length === 0) {
                            // FF
                            color_map = legend_data.find('sld\\:ColorMap');
                        }
                        let l:WmsMapLegend = color_map.length !== 0 ?
                            new WmsMapLegend(this.griddedPipes,
                                    $jq(color_map.toArray()[0]),
                                    layerDefinition,
                                    legend_data) : undefined;
                        return this.legends[layerName] = l;
                    });
            });
    }
}
