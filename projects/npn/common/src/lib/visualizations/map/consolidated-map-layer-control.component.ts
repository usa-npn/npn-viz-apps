import { Component, Input, ViewChild } from '@angular/core';
import { MapSelection } from './map-selection';
import {
    NpnMapLayerService,
    MapLayerDefs,
    CATEGORY_PEST,
    MapLayerDefinition,
    CATEGORY_TEMP_ACCUM_30_YR_AVG,
    CATEGORY_TEMP_ACCUM_CURRENT_AK,
    CATEGORY_TEMP_ACCUM_CURRENT,
    CATEGORY_TEMP_ACCUM_DAILY_ANOM,
    CATEGORY_SIX_HIST_ANNUAL,
    CATEGORY_SIX_CURRENT_YEAR_AK,
    CATEGORY_SIX_CURRENT_YEAR,
    CATEGORY_SIX_DAILY_ANOM,
    CATEGORY_SIX_30_YR_AVG
} from '@npn/common/gridded';
import { FormControl } from '@angular/forms';
import { merge } from 'rxjs';
import { startWith, takeUntil } from 'rxjs/operators';
import { MonitorsDestroy } from '@npn/common/common';
import { GriddedRangeSliderControl } from './gridded-range-slider-control.component';

const CATEGORY_PESTS = CATEGORY_PEST;
const CATEGORY_TEMP_ACCUMULATIONS = 'Daily Temperature Accumulations';
const CATEGORY_SPRING_INDICES = 'Spring Indices';

@Component({
    selector: 'consolidated-map-layer-control',
    template: `
    <mat-form-field>
        <mat-select placeholder="Layer category" [(ngModel)]="selection.layerCategory" (selectionChange)="selection.layerName = null;">
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
        <p *ngIf="selection.layer.hasAbstract()" [innerHTML]="selection.layer.getAbstract()"></p>
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
    @ViewChild(GriddedRangeSliderControl) rangeSlider:GriddedRangeSliderControl;

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

const LOWER_44_CENTER:number[] = [38.535680, -99.248833];
const AK_CENTER:number[] = [64.559308, -141.465422];

enum TEMP_ACCUM_BASE {
    DAILY_30Y_AVG = 'Daily 30-year Average',
    CUR_DAY = 'Current Day',
    DAILY_ANOM = 'Daily Anomaly'
}
@Component({
    selector: 'temp-accum-map-layer-control',
    template: `
    <div class="base-ak">
        <mat-form-field class="base-layer">
            <mat-select placeholder="Layer" [formControl]="baseLayer">
                <mat-option *ngFor="let b of baseOpts" [value]="b">{{b}}</mat-option>
            </mat-select>
        </mat-form-field>
        <mat-checkbox [formControl]="alaska">Alaska</mat-checkbox>
    </div>
    <mat-form-field>
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
    baseOpts = [TEMP_ACCUM_BASE.DAILY_30Y_AVG,TEMP_ACCUM_BASE.CUR_DAY,TEMP_ACCUM_BASE.DAILY_ANOM];
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
                    initBaseValue = TEMP_ACCUM_BASE.CUR_DAY;
                    break;
                case CATEGORY_TEMP_ACCUM_DAILY_ANOM:
                    initBaseValue = TEMP_ACCUM_BASE.DAILY_ANOM;
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

        this.baseLayer.valueChanges
        .pipe(
            startWith(this.baseLayer.value),
            takeUntil(this.componentDestroyed)
        )
        .subscribe(baseLayer => {
            if(baseLayer === TEMP_ACCUM_BASE.CUR_DAY) {
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
            let categoryName = null;
            switch(base) {
                case TEMP_ACCUM_BASE.DAILY_30Y_AVG:
                    categoryName = CATEGORY_TEMP_ACCUM_30_YR_AVG;
                    break;
                case TEMP_ACCUM_BASE.CUR_DAY:
                    categoryName = ak ? CATEGORY_TEMP_ACCUM_CURRENT_AK : CATEGORY_TEMP_ACCUM_CURRENT;
                    break;
                case TEMP_ACCUM_BASE.DAILY_ANOM:
                    categoryName = CATEGORY_TEMP_ACCUM_DAILY_ANOM;
                    break;
            }
            this.selection.layerName = categories[categoryName].layers[degreesIndex].name;
            this.selection.redraw();
        });
        this.alaska.valueChanges
        .pipe(takeUntil(this.componentDestroyed))
        .subscribe(ak => this.selection.center = ak ? AK_CENTER : LOWER_44_CENTER);
    }
}

enum SIX_BASE {
    HIST_ANNUAL = 'Historic Annual',
    CUR_YEAR = 'Current Year',
    DAILY_ANOM = 'Daily Anomaly',
    THIRTY_YR_AVG = '30-Year Average'
}
enum SIX_LORB {
    LEAF = 'First Leaf',
    BLOOM = 'First Bloom'
}
@Component({
    selector: 'spring-index-map-layer-control',
    template: `
    <div class="base-ak">
        <mat-form-field class="base-layer">
            <mat-select placeholder="Layer" [formControl]="baseLayer">
                <mat-option *ngFor="let b of baseOpts" [value]="b">{{b}}</mat-option>
            </mat-select>
        </mat-form-field>
        <mat-checkbox [formControl]="alaska">Alaska</mat-checkbox>
    </div>
    <mat-form-field>
        <mat-select placeholder="Leaf or bloom" [formControl]="leafOrBloom">
            <mat-option *ngFor="let o of leafOrBloomOpts" [value]="o">{{o}}</mat-option>
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
export class SpringIndexMapLayerControlComponent extends MonitorsDestroy {
    @Input() selection:MapSelection;
    @Input() layerDefinitions:MapLayerDefs;

    baseLayer:FormControl;
    baseOpts = [SIX_BASE.HIST_ANNUAL,SIX_BASE.CUR_YEAR,SIX_BASE.DAILY_ANOM,SIX_BASE.THIRTY_YR_AVG];
    alaska:FormControl;
    leafOrBloom:FormControl;
    leafOrBloomOpts = [SIX_LORB.LEAF,SIX_LORB.BLOOM];

    ngOnInit() {
        const categories = this.layerDefinitions.categories.reduce((map,cat) => (map[cat.name] = cat) && map,{});
        let initBaseValue = SIX_BASE.HIST_ANNUAL;
        let initAkValue = false;
        let initLeafOrBloomValue = SIX_LORB.LEAF;
        const initLayerName = this.selection.layerName;
        if(initLayerName) {
            // re-build values based on which layer was selected
            const initCatName = [
                CATEGORY_SIX_HIST_ANNUAL,
                CATEGORY_SIX_CURRENT_YEAR_AK,
                CATEGORY_SIX_CURRENT_YEAR,
                CATEGORY_SIX_DAILY_ANOM,
                CATEGORY_SIX_30_YR_AVG
            ].find(catName => !!categories[catName].layers.find(l => l.name === initLayerName));
            const initCat = categories[initCatName];
            switch(initCatName) {
                case CATEGORY_SIX_HIST_ANNUAL:
                    initBaseValue = SIX_BASE.HIST_ANNUAL;
                    break;
                case CATEGORY_SIX_CURRENT_YEAR:
                case CATEGORY_SIX_CURRENT_YEAR_AK:
                    initBaseValue = SIX_BASE.CUR_YEAR;
                    break;
                case CATEGORY_SIX_DAILY_ANOM:
                    initBaseValue = SIX_BASE.DAILY_ANOM;
                    break;
                case CATEGORY_SIX_30_YR_AVG:
                    initBaseValue = SIX_BASE.THIRTY_YR_AVG;
            }
            initLeafOrBloomValue = initCat.layers[0].name === initLayerName
                ? SIX_LORB.LEAF
                : SIX_LORB.BLOOM;
            initAkValue = initCatName === CATEGORY_SIX_CURRENT_YEAR_AK;
        }
        console.log(`SpringIndexMapLayerControlComponent: initBaseValue="${initBaseValue}" initLeafOrBloomValue="${initLeafOrBloomValue}" initAkValue=${initAkValue}`);
        this.baseLayer = new FormControl(initBaseValue);
        this.alaska = new FormControl(initAkValue);
        this.leafOrBloom = new FormControl(initLeafOrBloomValue);

        this.baseLayer.valueChanges
        .pipe(
            startWith(this.baseLayer.value),
            takeUntil(this.componentDestroyed)
        )
        .subscribe(baseLayer => {
            if(baseLayer === SIX_BASE.CUR_YEAR) {
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
            this.alaska.valueChanges,
            this.leafOrBloom.valueChanges
        ).pipe(
            startWith(null),
            takeUntil(this.componentDestroyed)
        ).subscribe(() => {
            const base:SIX_BASE = this.baseLayer.value;
            const leafOrBloom:SIX_LORB = this.leafOrBloom.value;
            // IMPORTANT: in gridded-common for all six layer sets the first two are first leaf and bloom in that order
            const lorbIndex = leafOrBloom == SIX_LORB.LEAF ? 0 : 1;
            const ak:boolean = this.alaska.value;
            let categoryName = null;
            switch(base) {
                case SIX_BASE.HIST_ANNUAL:
                    categoryName = CATEGORY_SIX_HIST_ANNUAL
                    break;
                case SIX_BASE.CUR_YEAR:
                    categoryName = ak ? CATEGORY_SIX_CURRENT_YEAR_AK : CATEGORY_SIX_CURRENT_YEAR;
                    break;
                case SIX_BASE.DAILY_ANOM:
                    categoryName = CATEGORY_SIX_DAILY_ANOM;
                    break;
                case SIX_BASE.THIRTY_YR_AVG:
                    categoryName = CATEGORY_SIX_30_YR_AVG;
                    break;
            }
            this.selection.layerName = categories[categoryName].layers[lorbIndex].name;
            this.selection.redraw();
        });
        this.alaska.valueChanges
        .pipe(takeUntil(this.componentDestroyed))
        .subscribe(ak => this.selection.center = ak ? AK_CENTER : LOWER_44_CENTER);
    }
}