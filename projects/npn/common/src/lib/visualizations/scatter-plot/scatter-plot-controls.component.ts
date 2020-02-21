import {Component, Input } from '@angular/core';

import {ScatterPlotSelection,AXIS} from './scatter-plot-selection';
import { HigherSpeciesPhenophaseInputCriteria } from '../common-controls';
import * as d3 from 'd3';
import { MonitorsDestroy } from '@npn/common/common';
import { takeUntil, filter, debounceTime } from 'rxjs/operators';
import { VisSelectionEvent } from '../vis-selection';
import { faExclamationTriangle } from '@fortawesome/pro-light-svg-icons';

@Component({
    selector: 'scatter-plot-control',
    template: `
    <div *ngIf="!selection.canAddPlot" class="max-plots-reached"><fa-icon [icon]="faExclamationTriangle"></fa-icon> One more plot would exceed the maximum of {{selection.MAX_PLOTS}} allowed</div>
    <year-range-input [(start)]="selection.start" [(end)]="selection.end" (onStartChange)="yearChange()" (onEndChange)="yearChange()"></year-range-input>

    <div class="phenophase-input-wrapper" *ngFor="let spi of selection.plots; index as idx">
        <higher-species-phenophase-input
            gatherColor="true"
            [selection]="selection"
            [criteria]="criteria"
            [plot]="spi"
            (plotChange)="selection.update()">
        </higher-species-phenophase-input>
        <button *ngIf="selection.plots.length > 1" mat-button class="remove-plot" (click)="removePlot(idx)">Remove</button>
        <button *ngIf="idx === (selection.plots.length-1)" mat-button class="add-plot" [disabled]="!plotsValid() || !selection.canAddPlot" (click)="addPlot()">Add</button>
    </div>

    <div>
        <mat-form-field>
            <mat-select placeholder="X Axis" name="xAxis" [(ngModel)]="selection.axis" (ngModelChange)="redrawChange()">
              <mat-option *ngFor="let a of axis" [value]="a">{{a.label}}</mat-option>
            </mat-select>
        </mat-form-field>

        <mat-checkbox [(ngModel)]="selection.regressionLines" (change)="redrawChange()">Fit Lines</mat-checkbox>

        <mat-checkbox [(ngModel)]="selection.individualPhenometrics" (change)="selection.update()">Use Individual Phenometrics</mat-checkbox>
    </div>
    `,
    styles: [`
        year-range-input,
        .phenophase-input-wrapper {
            display: block;
            margin-top: 15px;
        }
        mat-form-field,
        mat-checkbox {
            padding-right: 10px;
        }
    `]
})
export class ScatterPlotControlsComponent extends MonitorsDestroy {
    @Input()
    selection: ScatterPlotSelection;
    axis = AXIS;
    criteria:HigherSpeciesPhenophaseInputCriteria;

    faExclamationTriangle = faExclamationTriangle;

    ngOnInit() {
        this.selection.pipe(
            filter(event => event === VisSelectionEvent.SCOPE_CHANGE),
            debounceTime(500),
            takeUntil(this.componentDestroyed)
        ).subscribe(() => this.updateCriteria());
        
        if(this.selection.plots.length === 0) {
            this.addPlot();
        }
        setTimeout(() => this.updateCriteria());
    }

    yearChange() {
        this.updateCriteria();
        this.selection.update();
    }

    updateCriteria() {
        this.criteria = {
            years: d3.range(this.selection.start,this.selection.end+1),
            stationIds: this.selection.getStationIds()
        };
    }

    redrawChange(change?) {
        if(change && !change.oldValue && change.newValue) { // e.g. no color to a color means a plot that wasn't valid is now potentially valid.
            this.selection.update();
        } else {
            this.selection.redraw();
        }
    }

    addPlot() {
        this.selection.plots.push({});
    }

    removePlot(index:number) {
        this.selection.plots.splice(index,1);
        this.selection.update();
    }

    plotsValid() {
        return this.selection.plots.length === this.selection.validPlots.length;
    }
}
