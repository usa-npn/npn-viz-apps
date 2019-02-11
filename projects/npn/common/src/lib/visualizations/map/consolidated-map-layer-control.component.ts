import { Component, Input } from '@angular/core';
import { MapSelection } from './map-selection';
import {
    NpnMapLayerService,
    MapLayerDefs,
    CATEGORY_PEST,
    MapLayerDefinition,
    CATEGORY_TEMP_ACCUM_30_YR_AVG,
    CATEGORY_TEMP_ACCUM_CURRENT_AK,
    CATEGORY_TEMP_ACCUM_CURRENT,
    CATEGORY_TEMP_ACCUM_DAILY_ANOM
} from '@npn/common/gridded';
import { FormControl } from '@angular/forms';
import { merge } from 'rxjs';
import { startWith, takeUntil } from 'rxjs/operators';
import { MonitorsDestroy } from '@npn/common/common';

const CATEGORY_PESTS = CATEGORY_PEST;
const CATEGORY_TEMP_ACCUMULATIONS = 'Temperature Accumulations';
const CATEGORY_SPRING_INDICES = 'Spring Indices';

@Component({
    selector: 'consolidated-map-layer-control',
    template: `
    <mat-form-field>
        <mat-select placeholder="Layer type" [(ngModel)]="selection.layerCategory" (selectionChange)="selection.layerName = null;">
            <mat-option [value]="null"></mat-option>
            <mat-option [value]="CATEGORY_PESTS">{{CATEGORY_PESTS}}</mat-option>
            <mat-option [value]="CATEGORY_TEMP_ACCUMULATIONS">{{CATEGORY_TEMP_ACCUMULATIONS}}</mat-option>
            <mat-option [value]="CATEGORY_SPRING_INDICES">{{CATEGORY_SPRING_INDICES}}</mat-option>
        </mat-select>
    </mat-form-field>
    <div [ngSwitch]="selection.layerCategory" *ngIf="selection.layerCategory && layerDefinitions">
        <pest-map-layer-control *ngSwitchCase="CATEGORY_PESTS" [selection]="selection" [layerDefinitions]="layerDefinitions"></pest-map-layer-control>
        <temp-accum-map-layer-control *ngSwitchCase="CATEGORY_TEMP_ACCUMULATIONS" [selection]="selection" [layerDefinitions]="layerDefinitions"></temp-accum-map-layer-control>
        <spring-index-map-layer-control *ngSwitchCase="CATEGORY_SPRING_INDICES" [selection]="selection" [layerDefinitions]="layerDefinitions"></spring-index-map-layer-control>
    </div>
    <div *ngIf="selection.layer" class="layer-controls">
        <extent-control [selection]="selection"></extent-control>
        <supports-opacity-control [supportsOpacity]="selection"></supports-opacity-control>
        <gridded-range-slider [selection]="selection"></gridded-range-slider>
        <p *ngIf="selection.layer.hasAbstract()">{{selection.layer.getAbstract()}}</p>
    </div>
    `,
    styles:[`
    :host {
        display: block;
    }
    :host > mat-form-field {
        display: block;
    }
    .layer-controls {
        width: 400px;
    }
    .layer-controls >p {
        margin: 12px 0px 0px 0px;
    }
    .layer-controls >supports-opacity-control .mat-slider.mat-slider-horizontal {
        font-weight: 600;
        display: block;
        padding-top: 0px;
        padding-left: 0px;
    }
    `]
})
export class ConsolidatedMapLayerControlComponent {
    @Input() selection:MapSelection;
    layerDefinitions:MapLayerDefs;

    CATEGORY_PESTS = CATEGORY_PESTS;
    CATEGORY_TEMP_ACCUMULATIONS = CATEGORY_TEMP_ACCUMULATIONS;
    CATEGORY_SPRING_INDICES = CATEGORY_SPRING_INDICES;

    constructor(
        private layerService:NpnMapLayerService
    ) {}

    ngOnInit() {
        this.layerService.getLayerDefinitions().then((defs:MapLayerDefs) => this.layerDefinitions = defs);
    }
}

@Component({
    selector: 'pest-map-layer-control',
    template: `
    <mat-form-field>
        <mat-select placeholder="Pest" [(ngModel)]="selection.layerName" (selectionChange)="selection.redraw()">
            <mat-option *ngFor="let l of layers" [value]="l.name">{{l.title}}</mat-option>
        </mat-select>
    </mat-form-field>
    `,
    styles: [`
    mat-form-field {
        display: block;
    }
    `]
})
export class PestMapLayerControlComponent {
    @Input() selection:MapSelection;
    @Input() layerDefinitions:MapLayerDefs;

    layers:MapLayerDefinition[];

    ngOnInit() {
        this.layers = this.layerDefinitions.categories.find(c => c.name === CATEGORY_PEST).layers;
    }
}

enum TEMP_ACCUM_BASE {
    DAILY_30Y_AVG = 'Daily 30-year Average',
    CDAY = 'Current Day',
    ANOM = 'Daily Anomaly'
}
@Component({
    selector: 'temp-accum-map-layer-control',
    template: `
    <div class="base-ak">
        <mat-form-field class="base-layer">
            <mat-select placeholder="Base layer" [formControl]="baseLayer">
                <mat-option *ngFor="let b of baseOpts" [value]="b">{{b}}</mat-option>
            </mat-select>
        </mat-form-field>
        <mat-checkbox [formControl]="alaska">Alaska</mat-checkbox>
    </div>
    <mat-form-field class="deg-base">
        <mat-select placeholder="Degree base" [formControl]="degreeBase">
            <mat-option [value]="32">32 &deg;</mat-option>
            <mat-option [value]="50">50 &deg;</mat-option>
        </mat-select>
    </mat-form-field>
    
    `,
    styles:[`
    :host {
        display: block;
    }
    .base-ak {
        display:flex;
        align-items: center;
    }
    .base-layer {
        padding-right: 10px;
        flex-grow: 1;
    }
    `]
})
export class TempAccumMapLayerControlComponent extends MonitorsDestroy {
    @Input() selection:MapSelection;
    @Input() layerDefinitions:MapLayerDefs;

    baseLayer:FormControl;
    baseOpts = [TEMP_ACCUM_BASE.DAILY_30Y_AVG,TEMP_ACCUM_BASE.CDAY,TEMP_ACCUM_BASE.ANOM];
    degreeBase:FormControl;
    alaska:FormControl;

    ngOnInit() {
        const categories = this.layerDefinitions.categories.reduce((map,cat) => (map[cat.name] = cat) && map,{});
        //console.log('TempAccumMapLayerControlComponent: TEMP ACCUM CATEGORIES',categories);
        let initBaseValue = TEMP_ACCUM_BASE.DAILY_30Y_AVG;
        let initDegValue = 32;
        let initAkValue = false;
        const initLayerName = this.selection.layerName;
        if(initLayerName) {
            // re-build values based on which layer was selected
            const initCatName = [
                CATEGORY_TEMP_ACCUM_30_YR_AVG,
                CATEGORY_TEMP_ACCUM_CURRENT_AK,
                CATEGORY_TEMP_ACCUM_CURRENT,
                CATEGORY_TEMP_ACCUM_DAILY_ANOM
            ].find(catName => !!categories[catName].layers.find(l => l.name === initLayerName));
            const initCat = categories[initCatName];
            //console.log(`TempAccumMapLayerControlComponent: ${initLayerName} is in "${initCatName}"`,initCat);
            switch(initCatName) {
                case CATEGORY_TEMP_ACCUM_30_YR_AVG:
                    initBaseValue = TEMP_ACCUM_BASE.DAILY_30Y_AVG;
                    break;
                case CATEGORY_TEMP_ACCUM_CURRENT:
                case CATEGORY_TEMP_ACCUM_CURRENT_AK:
                    initBaseValue = TEMP_ACCUM_BASE.CDAY;
                    break;
                case CATEGORY_TEMP_ACCUM_DAILY_ANOM:
                    initBaseValue = TEMP_ACCUM_BASE.ANOM;
                    break;
            }
            initDegValue = initCat.layers[0].name === initLayerName
                ? 32
                : 50;
            initAkValue = initCatName === CATEGORY_TEMP_ACCUM_CURRENT_AK;
        }
        console.log(`TempAccumMapLayerControlComponent: initBaseValue="${initBaseValue}" initDegValue=${initDegValue} initAkValue=${initAkValue}`);
        this.baseLayer = new FormControl(initBaseValue);
        this.degreeBase = new FormControl(initDegValue);
        this.alaska = new FormControl(initAkValue);

        this.baseLayer.valueChanges.pipe(
            startWith(this.baseLayer.value),
            takeUntil(this.componentDestroyed)
        )
        .subscribe(baseLayer => {
            if(baseLayer === TEMP_ACCUM_BASE.CDAY) {
                this.alaska.enable();
            } else {
                this.alaska.disable();
                if(this.alaska.value) {
                    this.alaska.setValue(false);
                }
            }
        });
        merge(
            this.baseLayer.valueChanges,
            this.degreeBase.valueChanges,
            this.alaska.valueChanges
        ).pipe(
            startWith(null),
            takeUntil(this.componentDestroyed)
        ).subscribe(() => {
            const base:TEMP_ACCUM_BASE = this.baseLayer.value;
            const degrees:number = this.degreeBase.value;
            // IMPORTANT: in gridded-comomon for all temp accumulations layer sets there are two
            // layers, the first is 32 degree and the second is 50 degree
            const degreesIndex = degrees === 32 ? 0 : 1;
            const ak:boolean = this.alaska.value;
            switch(base) {
                case TEMP_ACCUM_BASE.DAILY_30Y_AVG:
                    this.selection.layerName = categories[CATEGORY_TEMP_ACCUM_30_YR_AVG].layers[degreesIndex].name;
                    break;
                case TEMP_ACCUM_BASE.CDAY:
                    const set = ak
                        ? categories[CATEGORY_TEMP_ACCUM_CURRENT_AK]
                        : categories[CATEGORY_TEMP_ACCUM_CURRENT];
                    this.selection.layerName = set.layers[degreesIndex].name;
                    break;
                case TEMP_ACCUM_BASE.ANOM:
                    this.selection.layerName = categories[CATEGORY_TEMP_ACCUM_DAILY_ANOM].layers[degreesIndex].name;
                    break;
            }
            this.selection.redraw();
        });
    }
}

@Component({
    selector: 'spring-index-map-layer-control',
    template: `
    spring-index-map-layer-control
    `
})
export class SpringIndexMapLayerControlComponent {
    @Input() selection:MapSelection;
    @Input() layerDefinitions:MapLayerDefs;

    ngOnInit() {

    }
}