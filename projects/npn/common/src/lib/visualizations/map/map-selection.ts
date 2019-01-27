import { VisSelection, selectionProperty } from '../vis-selection';
import { MapLayer, NpnMapLayerService, MapLayerLegend } from '../../gridded';
import { SupportsOpacity } from '@npn/common/gridded/supports-opacity-control.component';
import { WmsMapLayer } from '@npn/common/gridded/wms-map-layer';

export class MapSelection extends VisSelection implements SupportsOpacity {
    @selectionProperty()
    $class = 'MapSelection';

    @selectionProperty()
    _layerName:string;
    @selectionProperty()
    opacity:number = 0.75;
    @selectionProperty()
    _styleRange:number[];

    layer:MapLayer;
    legend:MapLayerLegend;

    constructor(private layerService:NpnMapLayerService) {
        super();
    }

    set layerName(s:string) {
console.log(`MapSelection.layerName=${s}`);
        this._layerName = s;
        // TODO should this happen here or in visualize.
        // seems like if the layer name changes then that's
        // the appropriate time to reset a layer on the map
        // and if deserializing from external this should be OK
        // since layer could not exist yet.
        if(this.layer && this.layer.layerName !== s) {
            this.layer.off();
            this.layer = undefined;
            this.legend = undefined;
            this.styleRange = undefined;
        }
    }

    get layerName():string {
        return this._layerName;
    }

    set styleRange(range:number[]) {
console.log(`MapSelection.styleRange=${range}`);
        this._styleRange = range;
        if(this.layer instanceof WmsMapLayer) {
            this.layer.setStyleRange(range);
        }
    }

    get styleRange():number[] {
        return this._styleRange;
    }

    // using functions here because of the SupportsOpacity interface.
    /** Sets the current opacity (0-1) for this layer. */
    setOpacity(opacity:number) {
console.log(`MapSelection.setOpacity=${opacity}`);
        this.opacity = opacity;
        if(this.layer) {
            this.layer.setOpacity(this.opacity);
        }
    }
    /** Gets the current opacity for this layer. */
    getOpacity():number { return this.opacity; }

    isValid():boolean {
        return true;
    }

    visualize(map: google.maps.Map):Promise<void> {
        const {layerName: wmsMapLayer} = this;
        console.log(`MapSelection.visualize`,this.external);
        if(wmsMapLayer) {
            /*
            if(this.layer && this.layer.layerName !== s) {
                this.layer.off();
                this.layer = undefined;
                this.legend = undefined;
                this.styleRange = undefined;
            }*/
            if(!this.layer) {
                return this.layerService.getLayerDefinition(wmsMapLayer)
                    .then(layerDef => this.layerService.newLayer(map,layerDef))
                    .then(layer => {
                        if(this.layer = layer) {
                            layer.setOpacity(this.opacity);
                            if(layer instanceof WmsMapLayer) {
                                layer.setStyleRange(this.styleRange);
                            }
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