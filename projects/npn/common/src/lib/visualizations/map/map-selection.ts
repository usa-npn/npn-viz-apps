import {
    selectionProperty,
    POPInput,
    BASE_POP_INPUT
} from '../vis-selection';
import {
    MapLayer,
    NpnMapLayerService,
    MapLayerLegend,
    WmsMapLayer,
    SupportsOpacity
} from '../../gridded';
import { SiteOrSummaryVisSelection, SiteOrSummaryPlotData } from '../site-or-summary-vis-selection';
import { NpnServiceUtils, SpeciesService } from '@npn/common/common';
import { HttpParams } from '@angular/common/http';

/**
 * Note: This type of selection contains more functionality than the underlying visualization
 * will care to make use of.  I.e. if `individualPhenometrics` is set to true then summarized
 * data would be used and if `networkIds` were populated on the selection they would be used
 * 
 * @dynamic
 */
export class MapSelection extends SiteOrSummaryVisSelection implements SupportsOpacity {
    $supportsPop:boolean = true;

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

    private map:google.maps.Map;
    layer:MapLayer;
    legend:MapLayerLegend;

    constructor(
        private layerService:NpnMapLayerService,
        protected serviceUtils:NpnServiceUtils,
        protected speciesService:SpeciesService
    ) {
        super(serviceUtils,speciesService);
    }

    toURLSearchParams(params: HttpParams = new HttpParams()): Promise<HttpParams> {
        params = params.set('request_src','npn-vis-map')
            .set('start_date',`${this.year}-01-01`)
            .set('end_date',`${this.year}-12-31`);
        return super.toURLSearchParams(params);
    }

    toPOPInput(input:POPInput = {...BASE_POP_INPUT}):Promise<POPInput> {
        return super.toPOPInput(input)
            .then(input => {
                input.startDate = `${this.year}-01-01`;
                input.endDate = `${this.year}-12-31`;
                return input;
            });
    }

    get year():number {
        return this._year;
    }
    set year(y:number) {
        this._year = y;
        this.update();
    }

    set layerCategory(s:string) {
        this._layerCategory = s;
        this.layerName = null;
        this.redraw();
    }
    get layerCategory():string { return this._layerCategory; }

    set layerName(s:string) {
        console.debug(`MapSelection.layerName=${s}`);
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
        console.debug(`MapSelection.styleRange=${range}`);
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
        console.debug(`MapSelection.setOpacity=${opacity}`);
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

    validForLayer():boolean {
        return !!this.layerName;
    }

    validForData():boolean {
        return typeof(this.year) === 'number' && this.validPlots.length > 0 &&
            typeof(this.numDaysQualityFilter) === 'number';
    }

    isValid():boolean {
        return this.validForLayer() || this.validForData();
    }

    // NOTE: There is no protection against this being called multiple times in fast succession
    // e.g. setLayerName, updateLayer, change layerName, call updateLayer
    // and if this happened there could be two Promises arguing over the ability set `this.layer`
    // which could cause a layer "sticking" on the map.
    updateLayer(map: google.maps.Map):Promise<void> {
        const {layerName} = this;
        console.debug(`MapSelection.updateLayer`,this.external);
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

    getData():Promise<SiteOrSummaryPlotData[]> {
        this.working = true;
        return (this.validForData()
            ? super.getData()
            : Promise.resolve([]))
            .then(results => {
                this.working = false;
                return results;
            });
    }
}