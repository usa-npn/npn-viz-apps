import { selectionProperty } from '../vis-selection';
import {
    MapLayer,
    NpnMapLayerService,
    MapLayerLegend,
    WmsMapLayer,
    SupportsOpacity
} from '../../gridded';
import { SiteOrSummaryVisSelection } from '../site-or-summary-vis-selection';
import { NpnServiceUtils, Species, Phenophase } from '@npn/common/common';
import { HttpParams } from '@angular/common/http';

export interface MapSelectionPlot {
    species: Species;
    phenophase: Phenophase;
}

/**
 * Note: This type of selection contains more functionality than the underlying visualization
 * will care to make use of.  I.e. if `individualPhenometrics` is set to true then summarized
 * data would be used and if `networkIds` were populated on the selection they would be used
 * 
 * @dynamic
 */
export class MapSelection extends SiteOrSummaryVisSelection implements SupportsOpacity {
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

    @selectionProperty() // vis supports a single year of data
    _year:number;
    @selectionProperty()
    plots:MapSelectionPlot[] = []; // up to 3

    private map:google.maps.Map;
    layer:MapLayer;
    legend:MapLayerLegend;

    constructor(private layerService:NpnMapLayerService,protected serviceUtils:NpnServiceUtils) {
        super(serviceUtils);
    }

    toURLSearchParams():HttpParams {
        let params = new HttpParams()
            .set('request_src','npn-vis-map')
            .set('start_date',`${this.year}-01-01`)
            .set('end_date',`${this.year}-12-31`);
        this.validPlots.forEach((p,i) => {
            params = params.set(`species_id[${i}]`,`${p.species.species_id}`)
                           .set(`phenophase_id[${i}]`,`${p.phenophase.phenophase_id}`);
        });
        return this.addNetworkParams(params);
    }

    get year():number {
        return this._year;
    }
    set year(y:number) {
        this._year = y;
        this.update();
    }

    get validPlots():MapSelectionPlot[] {
        return (this.plots||[]).filter(p => (!!p.species && !!p.phenophase));
    }

    set layerCategory(s:string) {
        this._layerCategory = s;
        this.layerName = null;
        this.redraw();
    }
    get layerCategory():string { return this._layerCategory; }

    set layerName(s:string) {
console.log(`MapSelection.layerName=${s}`);
        this._layerName = s;
        if(this.layer && this.layer.layerName !== s) {
            this.layer.off();
            this.layer = undefined;
            this.legend = undefined;
            // TODO allow propagation of styleRange
            // when switching layers
            this.styleRange = undefined;
        }
    }

    get layerName():string {
        return this._layerName;
    }

    set styleRange(range:number[]) {
console.log(`MapSelection.styleRange=${range}`);
        this._styleRange = range;
        if(this.layer && this.layer instanceof WmsMapLayer) {
            this.layer.setStyleRange(range);
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

    updateLayer(map: google.maps.Map):Promise<void> {
        const {layerName} = this;
console.log(`MapSelection.updateLayer`,this.external);
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
                return this.layerService.newLayer(map,layerName)
                    .then(layer => {
                        this.layer = layer;
                        layer.setOpacity(this.opacity);
                        if(layer instanceof WmsMapLayer) {
                            layer.setStyleRange(this.styleRange);
                        }
                        this.updateExtentValue();
                        layer.on();
                        return this.layer.getLegend().then(legend => {this.legend = legend});
                    });
            } else {
                this.layer.bounce();
            }
        } else {
            this.legend = this.layerService.getDefaultLegend();
        }
        return Promise.resolve();
    }

    getData():Promise<any[]> {
        // this vis is "always" valid since you don't have to plot
        // anything if you don't want to.
        this.working = true;
        return (this.year && this.validPlots.length
            ? super.getData()
            : Promise.resolve([]))
            .then(results => {
                this.working = false;
                return results;
            });
    }
}