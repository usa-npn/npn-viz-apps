import { NetworkAwareVisSelection, selectionProperty, ONE_DAY_MILLIS } from '../vis-selection';
import { NpnServiceUtils, NetworkService } from '../../common';
import {
    MapLayerLegend,
    SupportsOpacity,
    googleFeatureBounds,
    WcsDataService,
    GriddedInfoWindowHandler,
    NpnMapLayerService
} from '../../gridded';

import { DatePipe } from '@angular/common';

const SIX_NODATA_DISCLAIMER = `This Refuge has not yet met the requirements for the Spring Leaf Index model. Check back later in the year.`;

const SIX_LAYERS:ClippedLayerDef[] = [{
    id: 'current',
    label: 'Current Si-x leaf index',
    layerName: 'si-x:average_leaf_ncep',
    clippingService: 'si-x/area/clippedImage',
    statisticsService: 'si-x/area/statistics',
    noDataDisclaimer: SIX_NODATA_DISCLAIMER
},{
    id: 'forecast',
    label: '6-day forecast',
    layerName: 'si-x:average_leaf_ncep',
    clippingService: 'si-x/area/clippedImage',
    statisticsService: 'si-x/area/statistics',
    forecast: true,
    noDataDisclaimer: SIX_NODATA_DISCLAIMER
},{
    id: 'anomaly',
    label: 'Anomaly',
    layerName: 'si-x:leaf_anomaly',
    clippingService: 'si-x/anomaly/area/clippedImage',
    statisticsService: 'si-x/anomaly/area/statistics',
    noDataDisclaimer: SIX_NODATA_DISCLAIMER
}];
const AGDD_LAYERS:ClippedLayerDef[] = [{
    id: 'current',
    label: 'Current AGDD',
    layerName: 'gdd:agdd',
    clippingService: 'agdd/area/clippedImage',
    statisticsService: 'agdd/area/statistics',
},{
    id: 'forecast',
    label: '6-day forecast',
    layerName: 'gdd:agdd',
    clippingService: 'agdd/area/clippedImage',
    statisticsService: 'agdd/area/statistics',
    forecast: true,
},{
    id: 'anomaly',
    label: 'Anomaly',
    layerName: 'gdd:agdd_anomaly',
    clippingService: 'agdd/anomaly/area/clippedImage',
    statisticsService: 'agdd/anomaly/area/statistics',
}];

export class ClippedWmsMapSelection extends NetworkAwareVisSelection {
    @selectionProperty()
    $class:string = 'ClippedWmsMapSelection';

    @selectionProperty() // may need to use get/set pattern
    service:string = 'si-x'; // si-x || agdd
    @selectionProperty()
    layer:ClippedLayerDef = SIX_LAYERS[0];
    @selectionProperty()
    fwsBoundary:string;
    @selectionProperty()
    useBufferedBoundary:boolean = false;

    legend:MapLayerLegend;
    overlay:ImageOverlay;
    data:WmsMapSelectionData;
    private features:any[];
    private listeners:any[];
    private infoWindowHandler:GriddedInfoWindowHandler;

    // these are not persisted but status of spring dashboard or
    // other components can tailor them.
    public explicitDate:Date;
    public forecastDays:number = 6;

    constructor(protected serviceUtils:NpnServiceUtils,
                protected datePipe:DatePipe,
                protected mapLayerService:NpnMapLayerService,
                protected dataService:WcsDataService,
                protected networkService:NetworkService) {
        super(networkService);
    }

    isValid():boolean {
        return (this.service === 'si-x' || this.service === 'agdd') && !!this.layer && !!this.fwsBoundary;
    }

    get validServices(): any[] {
        return [{
            value: 'si-x',
            label: 'Spring index'
        },{
            value: 'agdd',
            label: 'Accumulated growing degree days'
        }];
    }
    get validLayers(): any[] {
        switch(this.service) {
            case 'si-x':
                return SIX_LAYERS;
            case 'agdd':
                return AGDD_LAYERS;
        }
        return [];
    }

    get apiDate(): string {
        // always "today" or 6 days in the future for forecast
        let d = this.explicitDate ?
            new Date(this.explicitDate.getTime()) : new Date();
        if(this.layer && this.layer.forecast) {
            d.setTime(d.getTime()+(this.forecastDays*ONE_DAY_MILLIS));
        }
        return this.datePipe.transform(d,'y-MM-dd');
    }

    getBoundary(): Promise<any> {
        const url = this.serviceUtils.dataApiUrl('/v0/si-x/area/boundary');
        const params = {
                format: 'geojson',
                fwsBoundary: this.fwsBoundary
            };
        return this.serviceUtils.cachedGet(url,params)
            .then(response => {
                if(response && response.boundary) {
                    return this.serviceUtils.cachedGet(response.boundary,{});
                }
                throw new Error('missing boundary in response.');
            });
    }

    getData(): Promise<any> {
        let url = this.serviceUtils.dataApiUrl(`/v0/${this.layer.clippingService}`),
            params = {
                layerName: this.layer.layerName,
                fwsBoundary: this.fwsBoundary,
                date: this.apiDate,
                useBufferedBoundary: this.useBufferedBoundary,
                style: true,
                fileFormat: 'png'
            };
        return this.serviceUtils.cachedGet(url,params);
    }

    getStatistics(): Promise<any> {
        const url = this.serviceUtils.dataApiUrl(`/v0/${this.layer.statisticsService}`);
        const params = {
                layerName: this.layer.layerName,
                fwsBoundary: this.fwsBoundary,
                date: this.apiDate,
                useBufferedBoundary: this.useBufferedBoundary,
                useCache: this.serviceUtils.dataApiUseStatisticsCache
            };
        return this.serviceUtils.cachedGet(url,params)
            .then(stats => {
                // translate the date string to a date object.
                let dateParts = /^(\d{4})-(\d{2})-(\d{2})/.exec(stats.date);
                stats.date = new Date(
                    parseInt(dateParts[1]),
                    parseInt(dateParts[2])-1,
                    parseInt(dateParts[3])
                );
                return stats;
            });

    }

    getAllData(): Promise<WmsMapSelectionData> {
        return Promise.all([
                this.getData(),
                this.getBoundary(),
                this.getStatistics()
            ])
            .then(arr => ({
                    data: arr[0],
                    boundary: arr[1],
                    statistics: arr[2]
                }));
    }

    fitBounds(map: google.maps.Map) {
        let bounds = undefined;
        if(this.data && this.data.data) {
            bounds = this.toBounds(this.data.data.bbox);
            if(bounds) {
                map.fitBounds(bounds);
            }
        }
        if(!bounds && this.features && this.features.length) {
            let allBounds = this.features.map(f => googleFeatureBounds(f)).filter(b => !!b);
            if(allBounds.length) {
                let bounds = allBounds[0];
                if(allBounds.length > 1) {
                    // union in the others
                    allBounds.slice(1).forEach(b => bounds.union(b));
                }
                map.fitBounds(bounds);
            }
        }
    }

    resizeMap(map: google.maps.Map): Promise<any> {
        return new Promise(resolve => {
            this.fitBounds(map);
            resolve();
        });
    }

    removeFrom(map: google.maps.Map): Promise<any> {
        return new Promise(resolve => {
            if(this.overlay) {
                this.overlay.remove();
            }
            (this.features||[]).forEach(f => {
                map.data.remove(f);
            });
            (this.listeners||[]).forEach(l => google.maps.event.removeListener(l));
            if(this.infoWindowHandler) {
                this.infoWindowHandler.close();
            }
            this.data = undefined;
            this.features = undefined;
            this.listeners = undefined;
            this.infoWindowHandler = undefined;
            this.overlay = undefined;
            this.legend = undefined;
            resolve();
        });
    }

    addTo(map: google.maps.Map): Promise<any> {
        return new Promise((_resolve,_reject) => {
            this.working = true;
            let resolve = (d?:any) => {
                    this.working = false;
                    _resolve(d);
                },
                reject = (e?:any) => {
                    this.working = false;
                    _reject(e);
                };
            if(this.overlay && this.features) {
                return reject('already added to map, call removeFrom');
            }
            this.getAllData()
                .then(all => {
                    if(this.overlay && this.features) {
                        console.log('in promise, already have overlay and features');
                        return resolve();
                    }
                    // have to do this so that the google api classes aren't
                    // touched too early and our class extension invalid
                    lazyClassLoader();

                    this.data = all;
                    let data = all.data,
                        bounds = this.toBounds(data.bbox),
                        clippedImage = data.clippedImage;
                    if(bounds) {
                        map.panTo(bounds.getCenter());
                        /*
                        let rect = new google.maps.Rectangle({
                            strokeColor: '#FF0000',
                            strokeOpacity: 0.8,
                            strokeWeight: 2,
                            fillColor: '#FF0000',
                            fillOpacity: 0.35,
                            map: map,
                            bounds: bounds
                        });*/
                        map.fitBounds(bounds);

                        this.overlay = new ImageOverLayImpl(bounds,clippedImage,map);
                        this.overlay.add();
                        this.infoWindowHandler = this.dataService.newInfoWindowHandler(map);
                        let wcsDateArg = `http://www.opengis.net/def/axis/OGC/0/time("${this.apiDate}T00:00:00.000Z")`,
                            wcsParamAugmenter = (params:any) => {
                                params.subset = params.subset||[];
                                params.subset.push(wcsDateArg);
                            };
                        this.listeners = this.listeners||[];
                        this.listeners.push(map.addListener('click',(event) =>
                            this.infoWindowHandler.open(event.latLng,this.layer.layerName,this.legend,wcsParamAugmenter)));
                    }

                    this.addBoundary(map,all.boundary);

                    this.mapLayerService.getLegend(data.layerClippedFrom)
                        .then(legend => {
                            console.debug('ClippedWmsMapSelection.legend:',legend);
                            this.legend = legend;
                            resolve();
                        })
                        .catch(reject);
                })
                .catch(reject);
        });

    }

    addBoundary(map: google.maps.Map,geoJson:any) {
        console.log('ClippedWmsMapSelection.addBoundary',geoJson);
        this.features = map.data.addGeoJson(geoJson);
        map.data.setStyle(feature => {
            return {
                strokeColor: '#000000',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#FF0000',
                fillOpacity: 0.0,
                clickable: false,
            };
        });
        this.fitBounds(map);
    }

    private toBounds(bbox:number[]): google.maps.LatLngBounds {
        if(bbox && bbox.length === 4) {
            let sw_lng = bbox[0],
                sw_lat = bbox[1],
                ne_lng = bbox[2],
                ne_lat = bbox[3];
            return new google.maps.LatLngBounds(
              new google.maps.LatLng(sw_lat,sw_lng),
              new google.maps.LatLng(ne_lat,ne_lng)
            );
            /*
            let coords = /^BOX\(\s*(-?\d+\.\d+)\s+(-?\d+\.\d+),\s*(-?\d+\.\d+)\s+(-?\d+\.\d+)\s*\)/.exec(this.box);
            if(coords.length === 5) {
                let sw_lng = parseFloat(coords[1]),
                    sw_lat = parseFloat(coords[2]),
                    ne_lng = parseFloat(coords[3]),
                    ne_lat = parseFloat(coords[4]);
                return new google.maps.LatLngBounds(
                  new google.maps.LatLng(sw_lat,sw_lng),
                  new google.maps.LatLng(ne_lat,ne_lng)
                );
            }*/
        }
        return null;
    }
    // lat + N of equator, - S of equator
    // lng + E of meridian - W of meridian
}

export interface ClippedLayerDef {
    id: string;
    label: string;
    layerName: string;
    clippingService: string;
    statisticsService: string;
    noDataDisclaimer?: string;
    forecast?: boolean;
}

interface ClippedImageResponse {
    date: string;
    layerClippedFrom: string;
    clippedImage: string;
    bbox: number [];
}

interface WmsMapSelectionData {
    data: ClippedImageResponse;
    boundary: any; // geoJson
    statistics: any;
};

interface ImageOverlay extends google.maps.OverlayView,SupportsOpacity {
    add();
    remove();
}
let ImageOverLayImpl: { new (bounds: google.maps.LatLngBounds, image: string, map: google.maps.Map): ImageOverlay };

function lazyClassLoader() {
    ImageOverLayImpl = class ImageOverLayImpl extends google.maps.OverlayView implements ImageOverlay {
        bounds: google.maps.LatLngBounds;
        image: string;
        map: google.maps.Map;
        div_:any;
        opacity:number = 0.75;

        constructor(bounds: google.maps.LatLngBounds, image: string, map: google.maps.Map) {
            super();
            this.bounds = bounds;
            this.image = image;
            this.map = map;
        }

        add() {
            (this as any).setMap(this.map);
        }

        remove() {
            (this as any).setMap(null);
        }

        setOpacity(o:number) {
            this.opacity = o;
            if(this.div_) {
                this.div_.style.opacity = o;
            }
        }

        getOpacity():number {
            return this.opacity;
        }

        onAdd() {
            let div = document.createElement('div');
            div.style.borderStyle = 'none';
            div.style.borderWidth = '0px';
            div.style.position = 'absolute';

            // Create the img element and attach it to the div.
            let img = document.createElement('img');
            img.src = this.image;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.position = 'absolute';
            div.appendChild(img);

            this.div_ = div;

            // Add the element to the "overlayLayer" pane.
            var panes = (this as any).getPanes();
            panes.overlayLayer.appendChild(div);
            this.setOpacity(this.opacity);
        }

        draw() {
            // We use the south-west and north-east
            // coordinates of the overlay to peg it to the correct position and size.
            // To do this, we need to retrieve the projection from the overlay.
            var overlayProjection = (this as any).getProjection();

            // Retrieve the south-west and north-east coordinates of this overlay
            // in LatLngs and convert them to pixel coordinates.
            // We'll use these coordinates to resize the div.
            var sw = overlayProjection.fromLatLngToDivPixel(this.bounds.getSouthWest());
            var ne = overlayProjection.fromLatLngToDivPixel(this.bounds.getNorthEast());

            // Resize the image's div to fit the indicated dimensions.
            var div = this.div_;
            div.style.left = sw.x + 'px';
            div.style.top = ne.y + 'px';
            div.style.width = (ne.x - sw.x) + 'px';
            div.style.height = (sw.y - ne.y) + 'px';
        }

        onRemove() {
            this.div_.parentNode.removeChild(this.div_);
            this.div_ = null;
        }
    }
}
