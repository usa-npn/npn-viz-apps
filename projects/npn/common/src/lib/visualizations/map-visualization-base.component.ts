import { Component } from '@angular/core';

import { VisSelection, VisSelectionEvent } from './vis-selection';
import { VisualizationBaseComponent, VisualizationSizing, VisualizationMargins } from './visualization-base.component';

/*
IMPORTANT: see not in VisualizationBaseComponent

@Component({
  selector: 'map-visualization-base',
  templateUrl: './map-visualization-base.component.html',
  styleUrls: ['./map-visualization-base.component.scss']
})
*/
export class MapVisualizationBaseComponent extends VisualizationBaseComponent {
    protected latitude: number = 38.8402805;
    protected longitude: number = -97.61142369999999
    protected zoom: number = 4;

    protected getMapResolver;
    protected getMapPromise = new Promise<google.maps.Map>(resolve => {
        this.getMapResolver = resolve;
    });

    mapStyles: any[] = [{
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
    }, {
        featureType: 'transit.station',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
    },
    {
        featureType: 'poi.park',
        stylers: [{ visibility: 'off' }]
    },
    {
        featureType: 'landscape',
        stylers: [{ visibility: 'off' }]
    }];

    mapReady(map: google.maps.Map): void {
        map.addListener('resize', () => {
            console.log('resize happened');
            console.log('panning to center');
            map.setZoom(3);
            setTimeout(() => {
                map.panTo(new google.maps.LatLng(this.latitude, this.longitude));
                map.setZoom(this.zoom);
            }, 500);
        });
        this.getMapResolver(map);
    }

    protected getMap(): Promise<google.maps.Map> {
        return this.getMapPromise;
    }

    protected resize(): void {
        this.getMap().then(map => {
            let sizing = this.getSizeInfo(),
                root = this.rootElement.nativeElement as HTMLElement,
                mapElm = root.querySelector('agm-map') as HTMLElement;
            mapElm.style.width = `${sizing.width}px`;
            mapElm.style.height = `${sizing.height}px`;
            google.maps.event.trigger(map, 'resize');
        });
    }

    protected reset(): void {
        this.getMap().then(map => {
            console.log('Map reset', map);
            map.panTo(new google.maps.LatLng(this.latitude, this.longitude));
            map.setZoom(this.zoom);
        });
    }

    protected redraw(): void {
        this.getMap().then(map => {
            console.log('Map redraw', map);
        });
    }
    protected update(): void {
        this.resize();
        this.getMap().then(map => {
            console.log('Map update', map);
        });
    }
}
