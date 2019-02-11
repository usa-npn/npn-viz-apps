import { VisSelection, selectionProperty } from '../vis-selection';
import {
    MapLayerProxy,
    NpnMapLayerService,
    MapLayerLegend,
    WmsMapLayer,
    SupportsOpacity
} from '../../gridded';

export class MapSelection extends VisSelection implements SupportsOpacity {
    @selectionProperty()
    $class = 'MapSelection';

    @selectionProperty()
    _layerCategory:string;
    @selectionProperty()
    _layerName:string;
    @selectionProperty()
    opacity:number = 0.75;
    @selectionProperty()
    _styleRange:number[];
    @selectionProperty()
    _extentValue:string;
    @selectionProperty()
    _center:number[]; // lat,lng
    @selectionProperty()
    _zoom:number;

    private map:google.maps.Map;
    layer:MapLayerProxy;
    legend:MapLayerLegend;

    constructor(private layerService:NpnMapLayerService) {
        super();
    }

    set layerCategory(s:string) {
        // TODO if the category changes, layername, etc. may need clearing.
        this._layerCategory = s;
    }
    get layerCategory():string { return this._layerCategory; }

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
            this.layer.setProxiedLayer(s);
            //this.layer = undefined;
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
        if(this.layer && this.layer.proxiedLayer instanceof WmsMapLayer) {
            this.layer.proxiedLayer.setStyleRange(range);
        }
    }

    get styleRange():number[] {
        return this._styleRange;
    }

    // returns true if a change was made
    private updateExtentValue():boolean {
        if(this.layer && this._extentValue) {
            const newValue = this.layer.extent.values.reduce((found,v) => found||(v.value === this._extentValue ? v : undefined),undefined);
            if(!newValue) {
                // this is OK if it happens, since we can keep the _extentValue from layer to layer
                // if the user switches from one layer to another with compatible extents then we can just
                // re-use it, which seems nice. o/w it should just go back to the "default"
                this._extentValue = undefined;
            } else if (this.layer.extent.current !== newValue) {
                this.layer.extent.current = newValue;
                return true;
            }
        }
        return false;
    }

    set extentValue(v:string) {
        this._extentValue = v;
        if(this.layer && this.updateExtentValue()) {
            this.redraw();
        }
    }

    get extentValue():string {
        return this._extentValue;
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

    get center():number[] { return this._center; }
    set center(latLng:number[]) {
        this._center = latLng;
        if(this.map && latLng && latLng.length === 2) {
            this.map.setCenter(new google.maps.LatLng(latLng[0],latLng[1]));
        }
    }

    get zoom():number { return this._zoom; }
    set zoom(z:number) {
        this._zoom = z;
        if(this.map && z !== this.map.getZoom()) {
            this.map.setZoom(z);
        }
    }

    isValid():boolean {
        return true;
    }

    visualize(map: google.maps.Map):Promise<void> {
        const {layerName} = this;
console.log(`MapSelection.visualize`,this.external);
        if(this.map !== map) {
            this.map = map;
            const latLng = this._center;
            if(latLng && latLng.length === 2) {
                this.map.setCenter(new google.maps.LatLng(latLng[0],latLng[1]));
            }
            if(this._zoom) {
                this.map.setZoom(this._zoom);
            }
            // this is perhaps a bit weird to have these listeners here
            // rather than outside but it allows us to more cleanly access
            // the "private" member properties are based upon.
            map.addListener('center_changed',() => {
                const latLng = this.map.getCenter();
                this._center = [
                    latLng.lat(),
                    latLng.lng()
                ];
            });
            map.addListener('zoom_changed',() => this._zoom = this.map.getZoom());
        }
        if(layerName) {
            if(!this.layer) {
                this.layer = new MapLayerProxy(map,this.layerService);
                this.layer.setOpacity(this.opacity);
            }
            if(this.layer.proxiedLayer && this.layer.layerName === layerName) {
                this.layer.bounce();
                return Promise.resolve();
            }
            return this.layer.setProxiedLayer(layerName)
                .then(proxiedLayer => {
                    if(proxiedLayer instanceof WmsMapLayer) {
                        proxiedLayer.setStyleRange(this.styleRange);
                    }
                    this.updateExtentValue();
                    this.layer.on();
                    return this.layer.getLegend()
                        .then(legend => {
                            this.legend = legend;
                        });
                });
        }
        return Promise.resolve();
    }
}