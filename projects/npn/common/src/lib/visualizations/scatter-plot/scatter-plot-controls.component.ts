import {Component, Input, OnInit} from '@angular/core';

import {VisSelectionEvent} from '../vis-selection';
import {ScatterPlotSelection,AXIS} from './scatter-plot-selection';

import {Subject} from 'rxjs';
import 'rxjs/add/operator/debounceTime';

@Component({
    selector: 'scatter-plot-control',
    template: `
    <year-range-input [(start)]="selection.start" [(end)]="selection.end" (onStartChange)="updateChange()" (onEndChange)="updateChange()"></year-range-input>

    <div class="phenophase-input-wrapper" *ngFor="let spi of selection.plots; index as idx">
        <species-phenophase-input
            [(species)]="spi.species" [(phenophase)]="spi.phenophase" [(color)]="spi.color"
            [selection]="selection"
            [gatherColor]="true"
            (onSpeciesChange)="updateChange()"
            (onPhenophaseChange)="updateChange()"
            (onColorChange)="redrawChange($event)"></species-phenophase-input>
        <button *ngIf="idx > 0" mat-button class="remove-plot" (click)="removePlot(idx)">Remove</button>
        <button *ngIf="selection.plots.length < 3 && idx === (selection.plots.length-1)" mat-button class="add-plot" [disabled]="!plotsValid()" (click)="addPlot()">Add</button>
    </div>

    <div>
        <mat-form-field>
            <mat-select placeholder="X Axis" name="xAxis" [(ngModel)]="selection.axis" (change)="redrawChange()">
              <mat-option *ngFor="let a of axis" [value]="a">{{a.label}}</mat-option>
            </mat-select>
        </mat-form-field>

        <mat-checkbox [(ngModel)]="selection.regressionLines" (change)="redrawChange()">Fit Lines</mat-checkbox>

        <mat-checkbox [(ngModel)]="selection.individualPhenometrics" (change)="updateChange()">Use Individual Phenometrics</mat-checkbox>

    </div>
    `,
    styles: [`
        year-range-input,
        .phenophase-input-wrapper {
            display: block;
            margin-top: 15px;
        }
    `]
})
export class ScatterPlotControls implements OnInit {
    @Input()
    selection: ScatterPlotSelection;
    axis = AXIS;

    updateSent:boolean = false;

    ngOnInit() {
        if(this.selection.plots.length === 0) {
            this.addPlot();
        }
    }

    updateChange() {
        if(this.selection.isValid()) {
            this.selection.update();
            this.updateSent = true;
        }
    }

    redrawChange(change?) {
        if(this.selection.isValid()) {
            if(change && !change.oldValue && change.newValue) { // e.g. no color to a color means a plot that wasn't valid is now potentially valid.
                this.updateChange();
            } else {
                if(this.updateSent) {
                    this.selection.redraw();
                } else {
                    this.updateChange();
                }
            }
        }
    }

    addPlot() {
        this.selection.plots.push({});
    }

    removePlot(index:number) {
        this.selection.plots.splice(index,1);
        this.updateChange();
    }

    plotsValid() {
        return this.selection.plots.length === this.selection.validPlots.length;
    }
}
