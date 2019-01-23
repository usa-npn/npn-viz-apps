import { VisSelection, selectionProperty } from '../vis-selection';
import { WmsMapLayer, WmsMapLayerService, WmsMapLegend, WmsMapLegendService } from '../../gridded';

export class MapSelection extends VisSelection {
    @selectionProperty()
    $class = 'MapSelection';

    @selectionProperty()
    wmsMapLayer:string;

    layer:WmsMapLayer;
    legend:WmsMapLegend;

    constructor(private layerService:WmsMapLayerService,private legendService:WmsMapLegendService) {
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
                return Promise.all([
                    this.layerService.getLayerDefinition(wmsMapLayer)
                        .then(layerDef => this.layerService.newLayer(map,layerDef)),
                    this.legendService.getLegend(wmsMapLayer)
                ])
                .then(results => {
                    const [layer,legend] = results;
                    
                    this.legend = legend;
                    if(this.layer = layer) {
                        layer.on();
                    }
                });
            }
        }
        return Promise.resolve();
    }
}