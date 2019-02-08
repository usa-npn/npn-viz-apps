import { Component, Input } from '@angular/core';
import { MapSelection } from './map-selection';
import {
    NpnMapLayerService,
    MapLayerDefs,
    CATEGORY_PEST,
    MapLayerDefinition
} from '@npn/common/gridded';

const CATEGORY_PESTS = CATEGORY_PEST;
const CATEGORY_TEMP_ACCUMULATIONS = 'Temperature Accumulations';
const CATEGORY_SPRING_INDICES = 'Spring Indices';

@Component({
    selector: 'consolidated-map-layer-control',
    template: `
    <mat-form-field>
        <mat-select placeholder="Layer" [(ngModel)]="selection.layerCategory" (selectionChange)="selection.layerName = null;">
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

@Component({
    selector: 'temp-accum-map-layer-control',
    template: `
    temp-accum-map-layer-control
    `
})
export class TempAccumMapLayerControlComponent {
    @Input() selection:MapSelection;
    @Input() layerDefinitions:MapLayerDefs;

    ngOnInit() {
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