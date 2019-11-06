import { BaseStepComponent, BaseControlComponent, BaseSubControlComponent } from "./base";
import { MAP_STYLES, BoundaryService, BoundaryType, StationAwareVisSelection, newGuid, googleFeatureBounds } from "@npn/common";
import { VisConfigStep, StepState } from "../interfaces";
import { faDrawPolygon, faTimes, faExpandArrowsAlt, faPlus, faCompressArrowsAlt } from "@fortawesome/pro-light-svg-icons";
import { Component, NgZone } from "@angular/core";
import { FormControl } from "@angular/forms";
import { Observable } from "rxjs";
import { takeUntil, filter } from "rxjs/operators";

import { scaleOrdinal, schemeCategory20 } from 'd3';
import { BoundarySelection, PredefinedBoundarySelection, isPolygonBoundarySelection, PolygonBoundarySelection } from '@npn/common/visualizations/vis-selection';

const BOUNDARY_LABEL_MAX_WIDTH = '220px';

@Component({
    template: `
    <div class="boundary-label" *ngIf="!controlComponent.boundaryHolders">Loading ...</div>
    <div class="boundary-label" *ngFor="let boundary of controlComponent.boundaryHolders">{{boundary.label}}</div>
    `,
    styles:[`
    .boundary-label {
        max-width: ${BOUNDARY_LABEL_MAX_WIDTH};
        overflow-x: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }
    `]
})
export class BoundaryStepComponent extends BaseStepComponent {
    title:string = 'Boundary';
    controlComponent:BoundaryControlComponent; 

    get state():StepState {
        return this.selection.boundaries.length > 0
            ? StepState.COMPLETE
            : StepState.AVAILABLE;
    }
}

const STYLE_KEY = '$style';
const DEFAULT_STYLES = {
    fillOpacity: 0.35,
    strokeWeight: 1
};
const BASE_BOUNDARY_STYLE = {
    ...DEFAULT_STYLES,
    clickable: true,
    strokeColor: '#fff',
};
const HOVER_BOUNDARY_STYLE = {
    ...BASE_BOUNDARY_STYLE,
    fillOpacity:1,
    strokeWeight:2
};
const LAT: number = 38.8402805;
const LNG: number = -97.61142369999999
const ZOOM: number = 4;

class BoundaryHolder {
    fillColor:string;
    guid:string;
    private _hovering:boolean = false;

    constructor(
        private component:BoundaryControlComponent,
        private map:google.maps.Map,
        public selection:BoundarySelection,
        public googleObject:google.maps.Data.Feature|google.maps.Polygon
    ) {
        this.guid = newGuid();
        if(googleObject instanceof google.maps.Data.Feature) {
            googleObject.setProperty('$BoundaryHolderGuid',this.guid);
        }
    }

    get hovering():boolean {
        return this._hovering;
    }

    set hovering(b:boolean) {
        if(this._hovering && !b) {
            this.mouseout();
        } else if (!this._hovering && b) {
            this.mouseover();
        }
        this._hovering = b;
    }

    isHandDrawn():boolean {
        return this.googleObject instanceof google.maps.Polygon;
    }

    isPredefined():boolean {
        return this.googleObject instanceof google.maps.Data.Feature
    }

    add():boolean {
        if(this.googleObject instanceof google.maps.Data.Feature) {
            this.map.data.add(this.googleObject);
            return true;
        } else if (this.googleObject instanceof google.maps.Polygon) {
            google.maps.event.addListener(this.googleObject,'mouseover',() => this.component.mouseover(this.googleObject));
            google.maps.event.addListener(this.googleObject,'mouseout',() => this.component.mouseout());
            this.googleObject.setMap(this.map);
            return true;
        }
        return false;
    }

    remove():boolean {
        if(this.googleObject instanceof google.maps.Data.Feature) {
            this.map.data.remove(this.googleObject);
            return true;
        } else if (this.googleObject instanceof google.maps.Polygon) {
            this.googleObject.setMap(null);
            google.maps.event.clearInstanceListeners(this.googleObject);
            return true;
        }
        return false;
    }

    setFillColor(fillColor:string) {
        this.fillColor = fillColor;
        if(this.googleObject instanceof google.maps.Data.Feature) {
            const style = this.googleObject.getProperty(STYLE_KEY);
            style.fillColor = fillColor;
            this.googleObject.setProperty(STYLE_KEY,style);
        } else if (this.googleObject instanceof google.maps.Polygon) {
            this.googleObject.setOptions({
                ...BASE_BOUNDARY_STYLE,
                fillColor
            });
        }
    }

    get label():string {
        if(isPolygonBoundarySelection(this.selection)) {
            return 'Hand-drawn boundary';
        }
        const predefSel = this.selection as PredefinedBoundarySelection;
        return `${predefSel.boundaryTypeName}: ${predefSel.boundaryName}`;
    }

    mouseover() {
        if(this.googleObject instanceof google.maps.Data.Feature) {
            this.map.data.overrideStyle(this.googleObject,{...this.googleObject.getProperty(STYLE_KEY),...HOVER_BOUNDARY_STYLE});
        } else if (this.googleObject instanceof google.maps.Polygon) {
            const {fillColor} = this;
            (this.googleObject as google.maps.Polygon).setOptions({
                ...HOVER_BOUNDARY_STYLE,
                fillColor
            });
        }
    }

    mouseout() {
        if(this.googleObject instanceof google.maps.Data.Feature) {
            this.map.data.revertStyle();
        } else if (this.googleObject instanceof google.maps.Polygon) {
            const {fillColor} = this;
            (this.googleObject as google.maps.Polygon).setOptions({
                ...BASE_BOUNDARY_STYLE,
                fillColor
            });
        }
    }
}

@Component({
    template: `
    <mat-list>
        <h3 matSubheader>Boundaries</h3>
        <mat-list-item *ngIf="boundaryHolders && !boundaryHolders.length">None</mat-list-item>
        <mat-list-item *ngIf="!boundaryHolders">Loading ...</mat-list-item>
        <mat-list-item *ngFor="let boundary of boundaryHolders; index as i"
            (mouseover)="mouseover(boundary.googleObject)" (mouseout)="mouseout(boundary.googleObject)">
            <mat-icon mat-list-icon [ngStyle]="{
                'background-color': boundary.fillColor,
                opacity: boundary.hovering ? 1.0 : swatchOpacity
            }"><fa-icon [icon]="polygonIcon"></fa-icon></mat-icon>
            <div class="boundary-label">{{boundary.label}}</div>
            <button mat-icon-button *ngIf="!addingBoundary()"
                matTooltip="Remove boundary" matTooltipPosition="right"
                (click)="removeBoundary(i)"><fa-icon [icon]="removeBoundaryIcon"></fa-icon></button>
        </mat-list-item>
    </mat-list>
    <mat-toolbar>
        <span class="spacer"></span>
        <button mat-icon-button [disabled]="!boundaryHolders?.length"
            matTooltip="Fit boundaries" matTooltipPosition="right"
            (click)="fitBoundaries()"><fa-icon [icon]="fitBoundariesIcon"></fa-icon></button>
        <button mat-icon-button
            matTooltip="Reset center/zoom" matTooltipPosition="right"
            (click)="resetFit()"><fa-icon [icon]="resetFitIcon"></fa-icon></button>
    </mat-toolbar>
    <div class="controls">
        <div *ngIf="addingPredefined">
            <mat-form-field>
                <mat-select placeholder="Boundary type" [formControl]="boundaryTypeControl">
                    <mat-option></mat-option>
                    <mat-option *ngFor="let boundaryType of boundaryTypes | async" [value]="boundaryType">{{boundaryType.name}}</mat-option>
                </mat-select>
            </mat-form-field>
            <mat-form-field>
                <mat-select placeholder="Boundary" [formControl]="boundaryControl">
                    <mat-option>No boundary</mat-option>
                    <mat-option *ngFor="let boundary of boundaries | async" [value]="boundary">{{boundary.getProperty('name')}}</mat-option>
                </mat-select>
            </mat-form-field>
        </div>
        <button class="block-button" *ngIf="!addingBoundary()" mat-button (click)="startHandDrawn()"><fa-icon [icon]="addIcon"></fa-icon> Add hand-drawn boundary</button>
        <button class="block-button" *ngIf="!addingBoundary()" mat-button (click)="startPredefined()"><fa-icon [icon]="addIcon"></fa-icon> Add pre-defined boundary</button>
        <button class="block-button" *ngIf="addingBoundary()" mat-button (click)="cancelAdd()">Cancel add boundary</button>
    </div>
    `,
    styles:[`
    mat-toolbar {
        height: 32px;
    }
    .spacer {
        flex: 1 1 auto;
    }
    .controls {
        padding-top: 15px;
    }
    button.block-button {
        display: block;
        margin: 0px auto;
    }
    mat-form-field {
        display: block;
    }
    .misc-title,
    *[matSubheader] {
        text-transform: none !important;
    }
    mat-list-item mat-icon {
        margin-right: 5px;
    }
    .boundary-label {
        display: inline-block;
        max-width: ${BOUNDARY_LABEL_MAX_WIDTH};
        overflow-x: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }
    .fit-controls {
        text-align: right;
    }
    `]
})
export class BoundaryControlComponent extends BaseControlComponent {
    title:string = 'Select boundaries';
    selection:StationAwareVisSelection;

    subControlComponent:BoundarySubControlComponent;
    mapPromiseResolver;
    mapPromise:Promise<google.maps.Map> = new Promise(resolve => this.mapPromiseResolver = resolve);

    boundaryTypes:Observable<BoundaryType[]>;
    boundaryTypeControl:FormControl;

    boundaries:Promise<google.maps.Data.Feature[]>
    boundaryControl:FormControl;

    colors = scaleOrdinal<number,string>(schemeCategory20);

    addIcon = faPlus;
    polygonIcon = faDrawPolygon;
    fitBoundariesIcon = faCompressArrowsAlt;
    resetFitIcon = faExpandArrowsAlt;
    removeBoundaryIcon = faTimes;
    swatchOpacity = BASE_BOUNDARY_STYLE.fillOpacity;

    working:boolean = false;
    addingPredefined:boolean = false;
    drawingManager:google.maps.drawing.DrawingManager;
    boundaryHolders:BoundaryHolder[];

    constructor(private boundaryService:BoundaryService,private zone:NgZone) {
        super();
    }

    private colorForIndex(i:number) {
        return this.colors((20+i)%20);
    }

    mouseover(o:google.maps.Data.Feature|google.maps.Polygon) {
        this.zone.run(() => {
            if(o instanceof google.maps.Data.Feature) {
                this.subControlComponent.featureHover = o.getProperty('name');
            }
            this.boundaryHolders.forEach(bh => bh.hovering = bh.googleObject === o);
        });
    }

    mouseout() {
        this.zone.run(() => {
            this.subControlComponent.featureHover = null;
            this.boundaryHolders.forEach(bh => bh.hovering = false);
        });
    }

    private featuresCache = {};
    loadFeatures(boundaryTypeId:number):Promise<google.maps.Data.Feature[]> {
        if(!this.featuresCache[boundaryTypeId]) {
            this.boundaryControl.disable({emitEvent:false});
            this.working = true;
            this.featuresCache[boundaryTypeId] = Promise.all([
                this.mapPromise,
                this.boundaryService.getBoundaries(boundaryTypeId).toPromise()
            ]).then(results => {
                const [map,boundaries] = results;
                const features = map.data.addGeoJson(this.boundaryService.boundariesToFeatureCollection(boundaries));
                features.forEach(f => {
                    map.data.remove(f);
                    f.setProperty(STYLE_KEY,{...BASE_BOUNDARY_STYLE});
                });
                this.working = false;
                this.boundaryControl.enable({emitEvent:false});
                return features;
            });
        }
        return this.featuresCache[boundaryTypeId];
    }

    // initializes a new BoundaryHolder from a BoundarySelection (not added to map)
    initBoundary(boundarySelection:BoundarySelection):Promise<BoundaryHolder> {
        return this.mapPromise.then((map:google.maps.Map) => {
            if(isPolygonBoundarySelection(boundarySelection)) {
                const googlePoly = new google.maps.Polygon({...BASE_BOUNDARY_STYLE});
                googlePoly.setPath((boundarySelection as PolygonBoundarySelection).data.map(pair => new google.maps.LatLng(pair[0],pair[1])));
               return Promise.resolve(new BoundaryHolder(this,map,boundarySelection,googlePoly));
            }
            const predefSelection = boundarySelection as PredefinedBoundarySelection;
            return this.loadFeatures(predefSelection.typeId)
                .then(features => {
                    const selected = features.reduce((found,f) => {
                            if(!found && f.getProperty('boundary_id') == predefSelection.id) {
                                return f;
                            }
                            return found;
                        },undefined);
                    if(!selected) {
                        console.warn(`Unable to found boundary with id ${predefSelection.id}`);
                        return;
                    }
                    return new BoundaryHolder(this,map,predefSelection,selected);
                });
        });
    }

    addBoundary(boundarySelection:BoundarySelection):Promise<BoundaryHolder> {
        return this.initBoundary(boundarySelection)
            .then(boundaryHolder => {
                if(boundaryHolder.add()) {
                    const boundaries = this.selection.boundaries;
                    boundaries.push(boundarySelection);
                    this.selection.boundaries = boundaries; // re-assign to get update or pick up new list
                    this.boundaryHolders.push(boundaryHolder);
                    return this.updateStyles()
                        .then(() => boundaryHolder);
                }
                return null;
            });
    }

    initBoundaries():Promise<void> {
        return Promise.all(
            this.selection.boundaries.map(bs => this.initBoundary(bs))
        ).then(holders => {
            this.boundaryHolders = holders.filter(h => h.add());
            return this.updateStyles()
                .then(() => this.fitBoundaries());
        });
    }

    updateStyles():Promise<void> {
        return this.mapPromise.then(map => {
            this.boundaryHolders.forEach((bh,i) => bh.setFillColor(this.colorForIndex(i)));
            map.data.setStyle(f => f.getProperty(STYLE_KEY));
        });
    }

    fitBoundaries():Promise<void> {
        return this.boundaryHolders.length > 0
            ? this.mapPromise.then(map => {
                    const bounds = this.boundaryHolders.reduce((bounds,bh) => {
                        if(bh.isPredefined()) {
                            bounds.union(googleFeatureBounds(bh.googleObject));
                        } else if(bh.isHandDrawn()) {
                            (bh.googleObject as google.maps.Polygon).getPath().forEach(latLng => bounds.extend(latLng));
                        }
                        return bounds;
                    },new google.maps.LatLngBounds());
                    map.fitBounds(bounds);
                })
            : this.resetFit();
    }

    resetFit():Promise<void> {
        return this.mapPromise.then(map => {
            map.setZoom(ZOOM);
            map.setCenter(new google.maps.LatLng(LAT,LNG));
        });
    }

    removeBoundary(i:number):Promise<void> {
        const boundaries = this.selection.boundaries;
        boundaries.splice(i,1);
        this.selection.boundaries = boundaries;
        this.boundaryHolders.splice(i,1).forEach(holder => holder.remove());
        return this.updateStyles();
    }

    startHandDrawn() {
        this.mapPromise.then(map => {
            const dm = this.drawingManager = new google.maps.drawing.DrawingManager({
                drawingControlOptions: {
                    drawingModes: [google.maps.drawing.OverlayType.POLYGON]
                }
            });
            dm.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
            google.maps.event.addListener(dm,'polygoncomplete',(poly:google.maps.Polygon) => this.zone.run(() => {
                    poly.setMap(null); // remove drawn polygon and re-add
                    const data = poly.getPath().getArray().map(latLng => ([latLng.lat(),latLng.lng()]));
                    this.addBoundary({data})
                        .then(() => this.cancelHandDrawn())
                }));
            dm.setMap(map);
        });
    }

    addingBoundary():boolean {
        return !!this.drawingManager || this.addingPredefined;
    }

    cancelAdd() {
        return !!this.drawingManager
            ? this.cancelHandDrawn()
            : this.cancelPredefined();
    }

    cancelHandDrawn() {
        this.drawingManager.setMap(null);
        google.maps.event.clearInstanceListeners(this.drawingManager);
        delete this.drawingManager;
    }

    startPredefined() {
        this.addingPredefined = true;
        this.boundaryHolders.forEach(bh => bh.remove());
    }

    cancelPredefined() {
        this.boundaryTypeControl.setValue(null);
        this.boundaryHolders.forEach(bh => bh.add());
        this.updateStyles()
            .then(() => this.addingPredefined = false);
    }

    initMap(map:google.maps.Map) {
        this.mapPromiseResolver(map);
        map.data.addListener('click',($event:google.maps.Data.MouseEvent) =>
            this.zone.run(() => this.boundaryControl.setValue($event.feature))
        );
        map.data.addListener('mouseover',($event:google.maps.Data.MouseEvent) => this.mouseover($event.feature));
        map.data.addListener('mouseout',() => this.mouseout());
        this.initBoundaries();
    }
    
    ngOnInit() {
        this.boundaryTypeControl = new FormControl();
        this.boundaryTypes = this.boundaryService.getBoundaryTypes();
        this.boundaryControl = new FormControl();
        
        let currentFeatures;
        this.boundaryTypeControl.valueChanges
            .pipe(
                takeUntil(this.componentDestroyed)
            )
            .subscribe(boundaryType => {
                console.log(`BoundaryControlComponent.boundaryType`,boundaryType);
                this.mapPromise.then(map => {
                    (currentFeatures||[]).forEach(f => map.data.remove(f));
                    currentFeatures = undefined;
                    this.boundaryControl.setValue(null,{emitEvent:false});
                    this.boundaries = !!boundaryType
                        ? this.loadFeatures(boundaryType.type_id)
                        : undefined;
                    if(this.boundaries) {
                        this.boundaries.then(features => {
                            currentFeatures = features;
                            features.forEach((f,i) => {
                                const style = f.getProperty(STYLE_KEY);
                                style.fillColor = this.colorForIndex(i);
                                f.setProperty(STYLE_KEY,style);
                                map.data.add(f);
                            });
                            map.data.setStyle(f => f.getProperty(STYLE_KEY));
                        });
                    }
                });
            });

        this.boundaryControl.valueChanges
            .pipe(
                filter(feature =>
                    // must be an actual feature
                    !!feature &&
                    // must not already by selected
                    !this.boundaryHolders.reduce((found,bh) => (found||bh.googleObject === feature ? bh : undefined),undefined)
                ),
                takeUntil(this.componentDestroyed)
            )
            .subscribe(boundary => {
                    const boundaryType = this.boundaryTypeControl.value;
                    this.boundaryTypeControl.setValue(null);
                    const selected:PredefinedBoundarySelection = {
                        id: boundary.getProperty('boundary_id'),
                        boundaryName: boundary.getProperty('name'),
                        typeId: boundaryType.type_id,
                        boundaryTypeName: boundaryType.name
                    };
                    console.log(`BoundaryControlComponent.boundary`,selected);
                    Promise.all([
                        this.mapPromise,
                        this.loadFeatures(selected.typeId)
                    ]).then(results => {
                        const [map,features] = results;
                        features.forEach(f => map.data.remove(f));
                        this.cancelPredefined();
                        this.addBoundary(selected);
                    });
                });
    }

    stepVisit():void {
        super.stepVisit();
        this.subControlComponent.zoom = 4.1;
        setTimeout(() => this.subControlComponent.show(),500);
    }
}

@Component({
    template:`
    <div class="map-wrapper">
        <div class="vis-working" *ngIf="controlComponent.working">
            <npn-logo spin="false"></npn-logo>
        </div>
        <agm-map [streetViewControl]="false" [styles]="mapStyles" [scrollwheel]="false"
        [latitude]="latitude" [longitude]="longitude" [zoom]="zoom"
        (mapReady)="controlComponent.initMap($event);"></agm-map>
        <div *ngIf="featureHover" class="feature-hover mat-elevation-z1">{{featureHover}}</div>
    </div>
    `,
    // might be nicer if this type of CSS were simply global
    styleUrls:[
        '../../../../../../npn/common/src/lib/visualizations/map/map-visualization.component.scss',
        './boundary.scss'
    ]
})
export class BoundarySubControlComponent extends BaseSubControlComponent {
    title:string = 'Select boundaries';
    $fullScreen:boolean = true;
    $closeDisabled:boolean = true;

    latitude: number = LAT;
    longitude: number = LNG;
    zoom: number = ZOOM;

    mapStyles:any[] = MAP_STYLES;

    featureHover:string;
}

export const BoundaryStep:VisConfigStep = {
    icon: faDrawPolygon,
    stepComponent: BoundaryStepComponent,
    controlComponent: BoundaryControlComponent,
    subControlComponent: BoundarySubControlComponent
};