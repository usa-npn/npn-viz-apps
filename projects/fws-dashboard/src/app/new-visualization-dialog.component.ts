import {Component,Inject,Input,OnInit, ViewEncapsulation, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA,MatDialogRef} from '@angular/material';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';

import {EntityBase, Refuge, PhenologyTrail, DashboardMode, DashboardModeState} from './entity.service';
import {VisSelection,NetworkAwareVisSelection,StationAwareVisSelection,
        ActivityCurvesSelection,ScatterPlotSelection,CalendarSelection,
        ObserverActivitySelection,ObservationFrequencySelection,ClippedWmsMapSelection} from '@npn/common';

@Component({
    selector: 'new-vis-dialog',
    template: `
    <!-- for "station aware" visualizations display a multi-step process -->
    <mat-horizontal-stepper (selectionChange)="stepChanged($event)">
        <mat-step *ngIf="stationAware" [stepControl]="step1FormGroup" label="Select sites">
            <div class="step-wrapper">
                <div class="step-content">
                    <refuge-visualization-scope-selection *ngIf="mode === 'refuge'" [selection]="selection" [refuge]="entity" #scopeSelection></refuge-visualization-scope-selection>
                    <pheno-trail-visualization-scope-selection *ngIf="mode === 'phenology_trail'" [selection]="selection" [phenoTrail]="entity" #scopeSelection></pheno-trail-visualization-scope-selection>
                </div>
                <div class="step-nav">
                    <button mat-raised-button (click)="dialogRef.close()">Cancel</button>
                    <button mat-raised-button matStepperNext [disabled]="!!scopeSelection && !scopeSelection.valid">Next</button>
                </div>
            </div>
        </mat-step>

        <mat-step [stepControl]="step2FormGroup" label="Build visualization">
            <div *ngIf="showVis" class="step-wrapper">
                <div class="step-content">
                    <new-visualization-builder [selection]="selection" [entity]="entity"></new-visualization-builder>
                </div>
                <div class="step-nav">
                    <button mat-raised-button (click)="dialogRef.close()">Cancel</button>
                    <button mat-raised-button *ngIf="stationAware" matStepperPrevious>Back</button>
                    <button mat-raised-button matStepperNext [disabled]="!selection.isValid()">Next</button>
                </div>
            </div>
        </mat-step>

        <mat-step [stepControl]="step3FormGroup" label="Enter visualization details">
            <div *ngIf="showDetails" class="step-wrapper">
                <div class="step-content">
                    <mat-form-field class="visualization-title">
                        <input matInput placeholder="Visualization title" [(ngModel)]="selection.meta.title" required />
                    </mat-form-field>
                    <mat-form-field class="visualization-description">
                        <textarea matInput placeholder="Visualization description" [(ngModel)]="selection.meta.description"></textarea>
                    </mat-form-field>
                    <p class="step-instructions">Add a title and a description that will accompany this visualization on your Refuge Dashboard. The description can help explain the visualization to visitors to your Refuge Dashboard, and provide other background information that will assist with interpretation.</p>
                </div>
                <div class="step-nav">
                    <button mat-raised-button (click)="dialogRef.close()">Cancel</button>
                    <button mat-raised-button matStepperPrevious>Back</button>
                    <button mat-raised-button (click)="dialogRef.close(selection)" [disabled]="!selection.meta.title || !selection.isValid()">{{edit ? 'Save' : 'Add'}}</button>
                </div>
            </div>
        </mat-step>
    </mat-horizontal-stepper>
    `,
    styles: [`
        mat-horizontal-stepper {
            height: 100%;
        }
        /* ViewEncapsulation.None
           75px is slightly larger than the stepper header
        */
        .mat-horizontal-content-container {
            height: calc(100% - 75px);
        }
        .mat-horizontal-content-container .mat-horizontal-stepper-content {
            height: 100%;
        }
        .step-wrapper {
            height: 100%;
        }
        .step-nav {
            padding: 5px;
            height: 46px;
        }
        .step-content {
            height: calc(100% - 46px);
            overflow-y: auto;
        }

        .step-nav >button {
            margin-right: 5px;
        }

        .visualization-title,
        .visualization-description {
            display: block;
            width: 100%;
        }
        .visualization-description textarea {
            height: 5em;
        }
        .step-instructions {
            color: #666;
            font-size: 0.95em;
            margin-top: 20px;
        }
    `],
    encapsulation: ViewEncapsulation.None
})
export class NewVisualizationDialogComponent implements OnInit {
    edit:boolean;
    stationAware:boolean;
    step1FormGroup: FormGroup;
    step2FormGroup: FormGroup;
    step3FormGroup: FormGroup;
    showVis:number;
    showDetails:boolean;
    mode:DashboardMode = DashboardModeState.get();
    entity:EntityBase;
    selection: VisSelection;

    @ViewChild('scopeSelection')
    scopeSelection:any; // should there be a common base class?

    constructor(private formBuilder: FormBuilder,
                private dialogRef: MatDialogRef<NewVisualizationDialogComponent>,
                @Inject(MAT_DIALOG_DATA) private data:any) {
        this.step1FormGroup = this.formBuilder.group({
            firstCtrl: ['',Validators.required]
        });
        this.step2FormGroup = this.formBuilder.group({
            secondCtrl: ['',Validators.required]
        });
        this.step3FormGroup = this.formBuilder.group({
            thirdCtrl: ['',Validators.required]
        });
        this.selection = data.selection as VisSelection;
        this.entity = data.entity;
        this.edit = data.edit;
    }

    ngOnInit() {
        let s = this.selection;
        s.editMode = true;
        //s.debug = true; // uncomment to show the selection for dev purposes
        // NOTE: TS support for interfaces doesn't extend to actual runtime type
        // introspection.  VisSelection has class extensions Network/StationAwareVisSelection
        // that selections can extend, if use cases get more complex then may instead need
        // to use the `'stationIds' in s` kind of logic instead.
        this.stationAware = s instanceof StationAwareVisSelection;// || 'stationIds' in s;
        this.showVis = !this.stationAware ? 1 : 0;
        if(s instanceof NetworkAwareVisSelection) {
            if(!s.networkIds || !s.networkIds.length) { // don't change on edit (not necessary but seems appropriate)
                if(this.entity instanceof Refuge) {
                    s.networkIds = [this.entity.network_id];
                } else if (this.entity instanceof PhenologyTrail) {
                    s.networkIds = this.entity.network_ids.slice();
                }
            }
        }
        if(this.edit) {
            this.showVis++;
            this.selection.update();
        }
    }

    stepChanged($event) {
        let visIndex = !this.stationAware ? 0 : 1;
        console.debug(`NewVisualizationDialogComponent:stepChanged visIndex=${visIndex}`,$event);
        if($event.selectedIndex === visIndex) {
            this.showVis++;
            setTimeout(() => {
                if(this.showVis === 1 || !this.selection.isValid()) {
                    this.selection.resize()
                } else {
                    this.selection.update();
                }
            });
        }
        this.showDetails = $event.selectedIndex === (visIndex+1);
    }
}

@Component({
    selector: 'new-visualization-builder',
    template: `
    <activity-curves-control  *ngIf="activity" [selection]="activity"></activity-curves-control>
    <scatter-plot-control *ngIf="scatter" [selection]="scatter"></scatter-plot-control>
    <calendar-control *ngIf="calendar" [selection]="calendar" [onVisControlOptions]="true"></calendar-control>
    <observer-activity-control *ngIf="observer" [selection]="observer"></observer-activity-control>
    <observation-frequency-control *ngIf="observationFreq" [selection]="observationFreq"></observation-frequency-control>
    <clipped-wms-map-control *ngIf="clipped" [selection]="clipped"></clipped-wms-map-control>

    <npn-visualization *ngIf="selection" [selection]="selection"></npn-visualization>
    <!--pre *ngIf="selection">{{selection.external | json}}</pre-->
    `,
    styles:[`
        npn-visualization {
            margin-top: 20px;
            width: 90%; // within stepper o/w horizontal scroll
        }
    `]
})
export class NewVisualizationBuilderComponent implements OnInit {
    @Input()
    selection: VisSelection;
    @Input()
    entity: EntityBase;

    scatter: ScatterPlotSelection;
    calendar: CalendarSelection;
    activity: ActivityCurvesSelection;
    observer: ObserverActivitySelection;
    observationFreq: ObservationFrequencySelection;
    clipped: ClippedWmsMapSelection;

    ngOnInit() {
        let s = this.selection;
        //s.debug = true;
        if(s instanceof ActivityCurvesSelection) {
            this.activity = s;
        } else if(s instanceof ScatterPlotSelection) {
            this.scatter = s;
        } else if(s instanceof CalendarSelection) {
            this.calendar = s;
        } else if (s instanceof ObserverActivitySelection) {
            this.observer = s;
        } else if (s instanceof ObservationFrequencySelection) {
            this.observationFreq = s;
        } else if (s instanceof ClippedWmsMapSelection) {
            // this visualization only supported for Refuge
            this.clipped = s;
            s.fwsBoundary = (this.entity as Refuge).boundary_id;
        }
        s.resize();
    }
}


