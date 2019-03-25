import { BaseStepComponent, BaseControlComponent, BaseSubControlComponent } from "./base";
import { MAP_STYLES, BoundaryService, BoundaryType, Boundary, googleFeatureBounds } from "@npn/common";
import { VisConfigStep, StepState } from "../interfaces";
import { faLayerGroup } from "@fortawesome/pro-light-svg-icons";
import { Component, NgZone } from "@angular/core";
import { FormControl } from "@angular/forms";
import { Observable } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { scaleOrdinal, schemeCategory20 } from 'd3';

@Component({
    template: `
    step details
    `
})
export class BoundaryStepComponent extends BaseStepComponent {
    title:string = 'Boundary';

    get state():StepState {
        return this.selection.isValid()
            ? StepState.COMPLETE
            : StepState.AVAILABLE;
    }
}

const STYLE_KEY = '$style';
const SELECTED_OPACITY = 1.0;
const DEFAULT_OPACITY = 0.65;
const BASE_BOUNDARY_STYLE = {
    clickable: true,
    fillOpacity: DEFAULT_OPACITY,
    strokeColor: '#fff',
    strokeWeight: 1
};
const LAT: number = 38.8402805;
const LNG: number = -97.61142369999999
const ZOOM: number = 4;

@Component({
    template: `
    <mat-form-field>
        <mat-select placeholder="Boundary type" [formControl]="boundaryType">
            <mat-option></mat-option>
            <mat-option *ngFor="let bt of boundaryTypes | async" [value]="bt.type_id">{{bt.name}}</mat-option>
        </mat-select>
    </mat-form-field>
    <mat-form-field>
        <mat-select placeholder="Boundary" [formControl]="boundary">
            <mat-option>No boundary</mat-option>
            <mat-option *ngFor="let b of boundaries" [value]="b.boundary_id">{{b.name}}</mat-option>
        </mat-select>
    </mat-form-field>
    `,
    styles:[`
    mat-form-field {
        display: block;
    }
    `]
})
export class BoundaryControlComponent extends BaseControlComponent {
    title:string = 'Select boundary type';
    subControlComponent:BoundarySubControlComponent;
    mapPromiseResolver;
    mapPromise:Promise<google.maps.Map> = new Promise(resolve => this.mapPromiseResolver = resolve);

    boundaryTypes:Observable<BoundaryType[]>;
    boundaryType:FormControl = new FormControl();

    boundary:FormControl = new FormControl();
    boundaries:Boundary[];
    features:google.maps.Data.Feature[];
    colors = scaleOrdinal<number,string>(schemeCategory20);

    constructor(private boundaryService:BoundaryService,private zone:NgZone){
        super();
    }

    initMap(map:google.maps.Map) {
        this.mapPromiseResolver(map);
        map.data.addListener('click',($event:google.maps.Data.MouseEvent) =>
            this.zone.run(() => this.boundary.setValue($event.feature.getProperty('boundary_id')))
        );
        map.data.addListener('mouseover',($event:google.maps.Data.MouseEvent) =>
            map.data.overrideStyle($event.feature,{...$event.feature.getProperty(STYLE_KEY),fillOpacity:1,strokeWeight:2})
        );
        map.data.addListener('mouseout',($event:google.maps.Data.MouseEvent) => map.data.revertStyle());
    }

    ngOnInit() {
        this.boundaryTypes = this.boundaryService.getBoundaryTypes();
        // TODO init FormControls from selection

        this.boundaryType.valueChanges
            .pipe(takeUntil(this.componentDestroyed))
            .subscribe(typeId => this.loadBoundaries(typeId));

        this.boundary.valueChanges
            .pipe(takeUntil(this.componentDestroyed))
            .subscribe(boundaryId => this.mapPromise.then(map => {
                    console.log(`selected boundaryId=${boundaryId}`);
                    const haveBoundaryId = typeof(boundaryId) === 'number';
                    const selectedFeature = this.features.reduce((found,f) => {
                            const style:any = f.getProperty(STYLE_KEY);
                            const isSelected = !found && haveBoundaryId && f.getProperty('boundary_id') === boundaryId;
                            if(isSelected) {
                                found = f;
                            }
                            style.fillOpacity = isSelected
                                ? SELECTED_OPACITY
                                : DEFAULT_OPACITY;
                            return found;
                        },undefined);
                    map.data.setStyle(f => f.getProperty(STYLE_KEY));
                    if(selectedFeature) {
                        map.fitBounds(googleFeatureBounds(selectedFeature));
                    } else {
                        map.setZoom(ZOOM);
                        map.setCenter(new google.maps.LatLng(LAT,LNG));
                    }
                }));
    }

    removeBoundaries() {
        return this.mapPromise.then(map => new Promise(resolve => {
            let featureCount = this.features
                ? this.features.length
                : 0;
            if(!featureCount) {
                return resolve();
            }
            map.data.forEach(feature => {
                map.data.remove(feature);
                if(--featureCount == 0) {
                    resolve();
                }
            });
        }));
    }

    loadBoundaries(typeId:number) {
        Promise.all([
            this.mapPromise,
            this.boundaryService.getBoundaries(typeId).toPromise(),
            this.removeBoundaries()
        ]).then(results => {
            const [map,boundaries] = results;
            this.features = map.data.addGeoJson(
                this.boundaryService.boundariesToFeatureCollection(this.boundaries = boundaries)
            );
            this.features.forEach((f,i) => f.setProperty(STYLE_KEY,{
                    ...BASE_BOUNDARY_STYLE,
                    fillColor: this.colors((20+i)%20)
                }));
            map.data.setStyle(f => f.getProperty(STYLE_KEY));
        });
    }

    stepVisit():void {
        super.stepVisit();
        setTimeout(() => this.subControlComponent.show(),500);
    }
}

@Component({
    template:`
    <div class="map-wrapper">
        <agm-map [streetViewControl]="false" [styles]="mapStyles" [scrollwheel]="false"
        [latitude]="latitude" [longitude]="longitude" [zoom]="zoom"
        (mapReady)="controlComponent.initMap($event);"></agm-map>
    </div>
    `,
    // might be nicer if this type of CSS were simply global
    styleUrls:['../../../../../../npn/common/src/lib/visualizations/map/map-visualization.component.scss']
})
export class BoundarySubControlComponent extends BaseSubControlComponent {
    title:string = 'Select boundary';
    $fullScreen:boolean = true;
    $closeDisabled:boolean = true;

    latitude: number = LAT;
    longitude: number = LNG;
    zoom: number = ZOOM;

    mapStyles:any[] = MAP_STYLES;
}

export const BoundaryStep:VisConfigStep = {
    icon: faLayerGroup,
    stepComponent: BoundaryStepComponent,
    controlComponent: BoundaryControlComponent,
    subControlComponent: BoundarySubControlComponent
};