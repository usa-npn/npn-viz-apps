import { VisSelection, selectionProperty } from '../vis-selection';
import { MapLayer, NpnMapLayerService, MapLayerLegend } from '../../gridded';

export class MapSelection extends VisSelection {
    @selectionProperty()
    $class = 'MapSelection';

    @selectionProperty()
    wmsMapLayer:string;

    layer:MapLayer;
    legend:MapLayerLegend;

    constructor(private layerService:NpnMapLayerService) {
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