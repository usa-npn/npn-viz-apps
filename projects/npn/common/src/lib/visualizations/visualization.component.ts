import {Component,Input,OnInit} from '@angular/core';

import {VisSelection} from './vis-selection';

import {ScatterPlotSelection} from './scatter-plot';
import {CalendarSelection} from './calendar';
import {ActivityCurvesSelection} from './activity-curves';
import {ObserverActivitySelection} from './observer-activity';
import {ClippedWmsMapSelection} from './clipped-wms-map';
import {ObservationFrequencySelection} from './observation-frequency';

// the idea here is that with Angular 2/4 there is no $compile functionality
// so instead it's probably best to create an "all knowing" directive that
// includes all possible visualizations and picks which to render based on
// the type of selection it is given.
@Component({
    selector: 'npn-visualization',
    template: `
    <scatter-plot *ngIf="scatter" [selection]="scatter" [thumbnail]="thumbnail"></scatter-plot>
    <calendar *ngIf="calendar" [selection]="calendar"  [thumbnail]="thumbnail"></calendar>
    <activity-curves *ngIf="activity" [selection]="activity"  [thumbnail]="thumbnail"></activity-curves>
    <observer-activity *ngIf="observer" [selection]="observer" [thumbnail]="thumbnail"></observer-activity>
    <observation-frequency *ngIf="observationFreq" [selection]="observationFreq" [thumbnail]="thumbnail"></observation-frequency>
    <clipped-wms-map *ngIf="clippedWmsMap" [selection]="clippedWmsMap" [thumbnail]="thumbnail"></clipped-wms-map>
    <mat-expansion-panel *ngIf="selection.debug">
        <mat-expansion-panel-header>
            <mat-panel-title>Selection</mat-panel-title>
        </mat-expansion-panel-header>
        <pre>{{selection.external | json}}</pre>
    </mat-expansion-panel>
    `,
    styles: [`
        pre {
            font-family: "courier new";
        }
        mat-expansion-panel {
            margin-top: 10px;
        }
    `]
})
export class VisualizationComponent implements OnInit {
    @Input()
    thumbnail:boolean = false;

    @Input()
    selection: VisSelection;

    scatter: ScatterPlotSelection;
    calendar: CalendarSelection;
    activity: ActivityCurvesSelection;
    observer: ObserverActivitySelection;
    observationFreq: ObservationFrequencySelection;
    clippedWmsMap: ClippedWmsMapSelection;

    ngOnInit() {
        if(this.selection instanceof ScatterPlotSelection) {
            this.scatter = this.selection;
        } else if(this.selection instanceof CalendarSelection) {
            this.calendar = this.selection;
        } else if(this.selection instanceof ClippedWmsMapSelection) {
            this.clippedWmsMap = this.selection;
        } else if(this.selection instanceof ActivityCurvesSelection) {
            this.activity = this.selection;
        } else if(this.selection instanceof ObserverActivitySelection) {
            this.observer = this.selection;
        } else if (this.selection instanceof ObservationFrequencySelection) {
            this.observationFreq = this.selection;
        }
    }
}
