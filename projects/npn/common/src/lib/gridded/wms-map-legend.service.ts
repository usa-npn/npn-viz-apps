import {Injectable} from '@angular/core';
import * as $jq_ from 'jquery';
const $jq = $jq_;

import {WmsPipeFactory} from './wms-pipe-factory.service';
import {WmsMapLayerService} from './wms-map-layer.service';
import {NpnServiceUtils} from '../common/index';
import {WmsMapLegend} from './wms-map-legend';
import {WMS_VERSION,GriddedUrls} from './gridded-common';

@Injectable()
export class WmsMapLegendService {
    legends:any = {};

    constructor(private wmsPipeFactory:WmsPipeFactory,
                private serviceUtils:NpnServiceUtils,
                private layerService:WmsMapLayerService,
                private urls:GriddedUrls) {
    }

    getLegend(layerName:string):Promise<WmsMapLegend> {
        return new Promise((resolve,reject) => {
            if(this.legends[layerName]) {
                return resolve(this.legends[layerName]);
            }
            this.layerService.getLayerDefinition(layerName)
                .then(layerDefinition => {
                    if(!layerDefinition) {
                        return reject(`layer definition for ${layerName} not found.`)
                    }
                    this.serviceUtils.cachedGet(this.urls.wmsBaseUrl,{
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
                                new WmsMapLegend(this.wmsPipeFactory,
                                        $jq(color_map.toArray()[0]),
                                        layerDefinition,
                                        legend_data) : undefined;
                            this.legends[layerName] = l;
                            resolve(l);
                        })
                        .catch(reject);
                });

        });
    }
}
