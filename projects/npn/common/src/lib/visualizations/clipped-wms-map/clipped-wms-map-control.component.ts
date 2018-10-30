import {Component, Input, OnInit} from '@angular/core';
import {ClippedWmsMapSelection} from './clipped-wms-map-selection';

@Component({
    selector: 'clipped-wms-map-control',
    template: `
    <mat-form-field class="map-service-input">
        <mat-select placeholder="Map" [(ngModel)]="selection.service" (ngModelChange)="serviceChange()">
            <mat-option *ngFor="let s of validServices" [value]="s.value">{{s.label}}</mat-option>
        </mat-select>
    </mat-form-field>
    <mat-form-field class="map-layer-input">
        <mat-select placeholder="Layer" [(ngModel)]="selection.layer" (ngModelChange)="layerChange()">
            <mat-option *ngFor="let l of validLayers" [value]="l">{{l.label}}</mat-option>
        </mat-select>
    </mat-form-field>
    <mat-checkbox [(ngModel)]="selection.useBufferedBoundary" (change)="layerChange()">Use Buffered Boundary</mat-checkbox>
    `,
    styles:[`
        .map-service-input {
            width: 225px;
        }
        .map-layer-input {
            width: 155px;
        }
        mat-form-field {
            padding-right: 10px;
        }
    `]
})
export class ClippedWmsMapControl implements OnInit {
    @Input()
    selection: ClippedWmsMapSelection;

    validServices:any[];
    validLayers:any[];

    serviceChange() {
        this.validLayers = this.selection.validLayers;
        let selection = this.selection,
            layers = this.selection.validLayers;
        selection.layer = layers.length ? layers[0] : undefined;
        this.layerChange();
    }

    layerChange() {
        let selection = this.selection;
        if(selection.isValid()) {
            selection.update();
        } else {
            selection.reset();
        }
    }

    ngOnInit() {
        this.validServices = this.selection.validServices;
        this.serviceChange();
    }
}
