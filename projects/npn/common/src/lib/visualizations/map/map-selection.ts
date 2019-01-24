import { VisSelection, selectionProperty } from '../vis-selection';
import { NpnMapLayer, WmsMapLayerService, WmsMapLegend } from '../../gridded';

export class MapSelection extends VisSelection {
    @selectionProperty()
    $class = 'MapSelection';

    @selectionProperty()
    wmsMapLayer:string;

    layer:NpnMapLayer;
    legend:WmsMapLegend;

    constructor(private layerService:WmsMapLayerService) {
        super();
    }

    isValid():boolean {
        return true;
    }

    visualize(map: google.maps.Map):Promise<void> {
        const {wmsMapLayer} = this;
        console.log(`layer=${wmsMapLayer}`);
        if(wmsMapLayer) {
            if(this.layer && this.layer.layerName !== wmsMapLayer) {
                this.layer.off();
                this.layer = undefined;
                this.legend = undefined;
            }
            if(!this.layer) {
                return this.layerService.getLayerDefinition(wmsMapLayer)
                    .then(layerDef => this.layerService.newLayer(map,layerDef))
                    .then(layer => {
                        if(this.layer = layer) {
                            layer.on();
                            return layer.getLegend()
                                .then(legend => {
                                    this.legend = legend;
                                });
                        }
                    });
            }
        }
        return Promise.resolve();
    }
}