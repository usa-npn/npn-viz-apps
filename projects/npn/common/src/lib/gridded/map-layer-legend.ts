import * as $jq_ from 'jquery';
const $jq = $jq_;

import { MapLayer } from './map-layer';
import { GriddedPipeProvider } from './pipes';

import { Selection } from 'd3-selection';
import { MapLayerDefinition, MapLayerServiceType, LegendData, GriddedPointData, MapLayerType } from './gridded-common';
import { WcsDataService } from './wcs-data.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const IDENTITY = d => d;

export abstract class MapLayerLegend {
    private layer:MapLayer;
    private lformat:Function;
    private gformat:Function;
    private title_data:LegendData;
    private data:LegendData[];

    constructor(protected wcsDataService:WcsDataService,
                protected griddedPipes:GriddedPipeProvider,
                protected color_map:(any|LegendData[]),
                /*
                NOTE: per the original implementation which binds extents directly into the definition this is public
                may want to later revisit some abstraction, used externally via WmsMapLegendComponent
                 */
                public ldef:MapLayerDefinition,
                protected styleDefinition:any) {
            console.log('MapLayerLegend.color_map',color_map);
            console.log('MapLayerLegend.ldef',ldef);
            console.log('MapLayerLegend.styleDefinition',styleDefinition);
            let get_filter = (filter_def) => {
                let pipe = this.griddedPipes.get(filter_def.name);
                if(!pipe) {
                    console.error(`MapLayerLegend: Unable to find pipe named ${filter_def.name}`);
                }
                return function(l,q) {
                    let args = [q];
                    if(filter_def.args) {
                        args = args.concat(filter_def.args);
                    }
                    return pipe.transform.apply(pipe, args);
                };
            };
            this.lformat = ldef.legend_label_filter ? get_filter(ldef.legend_label_filter) : IDENTITY;
            if(ldef.name == 'precipitation:buffelgrass_prism') {
                let gridded_label_filter_clone = Object.assign({}, ldef.gridded_label_filter);
                gridded_label_filter_clone.name = 'legendBuffelgrassUnits';
                this.gformat = ldef.gridded_label_filter ? get_filter(gridded_label_filter_clone) : undefined;
            } else {
                this.gformat = ldef.gridded_label_filter ? get_filter(ldef.gridded_label_filter) : undefined;
            }
            let data:LegendData[];
            if(Array.isArray(color_map)) {
                data = color_map;
            } else {
                let entries = color_map.find('ColorMapEntry');
                if(entries.length === 0) {
                    entries = color_map.find('sld\\:ColorMapEntry');
                }
                data = entries.toArray().reduce((arr,entry,i) => {
                    var e = $jq(entry),
                        q = parseFloat(e.attr('quantity')),
                        l = e.attr('label');
                    arr.push({
                        color: e.attr('color'),
                        quantity: q,
                        original_label: l,
                        label: i === 0 ? l : this.lformat(l,q) // why the special case for index 0?
                    });
                    return arr;
                },[]);
            }
            this.title_data = data[0];
            this.data = data.slice(1);
    }

    setLayer(l:MapLayer):MapLayerLegend {
        this.layer = l;
        return this;
    }

    getLayer():MapLayer {
        return this.layer;
    }

    get layerType():MapLayerType {
        return this.layer
            ? this.layer.layerType
            : null;
    }

    get layerName():string {
        return this.layer 
            ? this.layer.layerName
            : null;
    }

    getData():LegendData[] {
        return this.data;
    }

    getStyleDefinition():any {
        return this.styleDefinition;
    }

    getTitle():string {
        return this.title_data.label;
    }

    getColors():string[] {
        return this.data.map(d => d.color);
    }

    getQuantities():number[] {
        return this.data.map(d => d.quantity);
    }

    getLabels():string[] {
        return this.data.map(d => d.label);
    }

    getOriginalLabels():string[] {
        return this.data.map(d => d.original_label);
    }

    formatPointData(q):string {
        return (this.gformat||this.lformat)(q,q);
    }

    getPointData(q):LegendData {
        var i,d,n;
        for(i = 0; i < this.data.length; i++) {
            d = this.data[i];
            n = (i+1) < this.data.length ? this.data[i+1] : undefined;
            if(q == d.quantity) {
                return d;
            }
            if(n && q >= d.quantity && q < n.quantity) {
                return d;
            }
        }
    }

    getGriddedPointData(latLng:google.maps.LatLng):Observable<GriddedPointData> {
        const augment = (params:any) => {
            if(this.layer.extent && this.layer.extent.current) {
                this.layer.extent.current.addToParams(params,MapLayerServiceType.WCS)
            }
        };
        return this.wcsDataService.getGriddedData(
            this.layer.layerBasis,
            latLng,
            5,
            augment
        ).pipe(
            map((tuples:number[]) => {
                console.log(`MapLayerLegend: gridded tuples`,tuples);
                const point = tuples && tuples.length ? tuples[0] : undefined;
                if(point === -9999 || isNaN(point)) {
                    return null;
                }
                const legendData = this.getPointData(point);
                const formatted = this.formatPointData(point);
                const result = {point,legendData,formatted};
                console.log('MapLayerLegend: gridded result',result);
                return result;
            })
        );
    }

    abstract redraw(svg:Selection<any,any,any,any>,legendTitle:string):void;
}


