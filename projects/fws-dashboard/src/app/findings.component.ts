import {Component,OnInit,Input,ElementRef,HostBinding,Inject,Injectable,Optional, ViewEncapsulation} from '@angular/core';
import {MatSnackBar,MatDialog,MatDialogRef} from '@angular/material';
import { MediaChange, ObservableMedia } from "@angular/flex-layout";

import {Refuge,RefugeService} from './refuge.service';
import {VisSelection,VisualizationSelectionFactory,NPN_BASE_HREF} from '@npn/common';
import {NewVisualizationDialogComponent} from './new-visualization-dialog.component';

import *  as $ from 'jquery';

const VIS_TEMPLATES = [{
    $class: 'ActivityCurvesSelection',
    $thumbnail: 'assets/activity-curves.png',
    $tooltip: 'Activity Curves'
},{
    $class: 'ScatterPlotSelection',
    $thumbnail: 'assets/scatter-plot.png',
    $tooltip: 'Scatter Plot'
},{
    $class: 'CalendarSelection',
    $thumbnail: 'assets/calendar.png',
    $tooltip: 'Calendar'
},{
    $class: 'ObserverActivitySelection',
    $thumbnail: 'assets/observer-activity.png',
    $tooltip: 'Observer Activity Metrics'
},{
    $class: 'ClippedWmsMapSelection',
    $thumbnail: 'assets/clipped-wms-map.png',
    $tooltip: 'Map'
},{
    $class: 'ObservationFrequencySelection',
    $thumbnail: 'assets/observation-frequency.png',
    $tooltip: 'Observation Frequency'
}];

@Component({
  selector: 'refuge-findings',
  template: `
<mat-list *ngIf="adminMode" class="new-vis-list">
  <div>
    <button mat-icon-button (click)="toggleAdminMode()" class="toggle-admin-mode"><i class="fa fa-2x fa-times-circle" aria-hidden="true"></i></button>
    <p>Click and drag the visualizations below onto your Refuge Dashboard. You can have up to 10 visualizations on your Dashboard at one time. You can have multiple versions of each visualization type.</p>
  </div>
  <mat-list-item class="vis-template"
                *ngFor="let template of visTemplates"
                (mouseenter)="lookAtVisDrop = true;" (mouseleave)="lookAtVisDrop = false;"
                [matTooltip]="template.$tooltip"
                matTooltipPosition="right"
                dnd-draggable [dragData]="template"
                [dropZones]="['newvis-dropZone']">
    <img class="new-vis-thumbnail" src="{{baseHref}}{{template.$thumbnail}}" />
  </mat-list-item>
  <mat-list-item class="trash"
                matTooltip="Drag and drop visualization here to remove"
                matTooltipPosition="right"
                dnd-droppable [dropZones]="['trash-dropZone']"
                (onDropSuccess)="trashVisualization($event)"></mat-list-item>
  <mat-list-item class="save">
    <button mat-icon-button aria-labelled="Save" (click)="save()" [disabled]="!isReordered()" matTooltip="Save current visualization order"><i class="fa fa-floppy-o" aria-hidden="true"></i><span *ngIf="isReordered()">*</span></button>
  </mat-list-item>
</mat-list>

<div class="visualizations" *ngIf="refuge" dnd-sortable-container [sortableData]="refuge.selections" [dropZones]="['list-dropZone','trash-dropZone']" >
    <mat-card  *ngFor="let selection of refuge.selections; first as isFirst; let i = index"
              dnd-sortable [sortableIndex]="i"
              [dragEnabled]="adminMode"
              [dragData]="selection"
              (onDragStart)="dragStart($event)"
              (onDropSuccess)="reorderVisualizations()">
        <div *ngIf="!isFirst && !mobileMode" class="cover" (click)="makeCurrent(selection)">
            <span class="visualization-title">{{selection.meta.title}} <button *ngIf="adminMode" mat-icon-button (click)="editVisualization(selection,$event)" matTooltip="Edit"><i class="fa fa-pencil" aria-hidden="true"></i></button></span>
        </div>
        <div *ngIf="isFirst || mobileMode" class="visualization-details">
            <div class="visualization-title">{{selection.meta.title}} <button *ngIf="adminMode" mat-icon-button (click)="editVisualization(selection,$event)" matTooltip="Edit"><i class="fa fa-pencil fa-2x" aria-hidden="true"></i></button></div>
            <p *ngIf="selection.meta.description" class="visualization-description">{{selection.meta.description}}</p>
        </div>
        <npn-visualization [selection]="selection" [thumbnail]="!mobileMode && i > 0"></npn-visualization>
    </mat-card>
    <mat-card *ngIf="adminMode && refuge.selections.length < maxVisualizations"
        dnd-droppable [dropZones]="['newvis-dropZone']"
        (onDropSuccess)="addVisualization($event)"
        [ngClass]="{'new-vis-placeholder': true, 'look-at-me': lookAtVisDrop}"></mat-card>
</div>
<button mat-raised-button *ngIf="userIsAdmin && !mobileMode && !adminMode && !isTouchDevice" (click)="toggleAdminMode()"><span class="admin-toggle">Customize</span></button>
  `,
  styleUrls: ['./findings.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class FindingsComponent implements OnInit {
    @Input()
    refuge:Refuge;
    @Input()
    userIsAdmin:boolean = false;
    isTouchDevice:boolean = false;

    trash:VisSelection[] = [];

    @HostBinding('class.adminMode') adminMode:boolean = false;
    maxVisualizations:number = 10;
    visTemplates:any[] = VIS_TEMPLATES;
    guidOrder:string[];
    dragStartIndex:number;
    lookAtVisDrop:boolean = false;
    mobileMode:boolean = false;

    constructor(private refugeService:RefugeService,
                private selectionFactory: VisualizationSelectionFactory,
                public dialog: MatDialog,
                private snackBar: MatSnackBar,
                private media:ObservableMedia,
                @Optional() @Inject(NPN_BASE_HREF) private baseHref?: string) {
        this.media.subscribe((mediaChange:MediaChange) => {
                this.mobileMode = mediaChange.mqAlias === 'xs' || mediaChange.mqAlias === 'sm'    ;
            });
        // test if the device supports touch
        let elm = document.createElement('div');
        elm.setAttribute('ontouchstart','return;');
        this.isTouchDevice = typeof(elm.ontouchstart) === 'function';
        if(this.isTouchDevice) {
            console.warn('Touch device detected any administrative functionality will be disabled.');
        }
    }

    toggleAdminMode() {
        this.adminMode = !this.adminMode;
        this.resizeAllAfterDelay();
        $('body').toggleClass('fws-customize-mode');
    }

    setRefuge(refuge:Refuge) {
        this.refuge = refuge;
        refuge.selections.forEach((s,i) => {
            //s.debug = (i === 0);
            s.update()
        });
        this.guidOrder = refuge.selections.map(s => s.guid);
    }

    ngOnInit() {
        this.setRefuge(this.refuge);
    }

    resizeAll() {
        this.refuge.selections.forEach((s,i) => {
            //s.debug = i === 0;
            s.resize()
        });
    }

    resizeAllAfterDelay() {
        setTimeout(() => {
            this.resizeAll();
        });
    }

    makeCurrent(s:VisSelection) {
        let selections = this.refuge.selections,
            index = selections.indexOf(s);
        if(index) {
            console.log('MAKE CURRENT',index);
            // swap the currently selected with the newly selected
            selections[index] = selections[0];
            selections[0] = s;
            this.reorderVisualizations();
        }
    }

    visDialog(s:VisSelection,edit?:boolean):MatDialogRef<NewVisualizationDialogComponent> {
        return this.dialog.open(NewVisualizationDialogComponent,{
            height: '90vh',
            width: '90vw',
            disableClose: true,
            data: {
                refuge: this.refuge,
                selection: s,
                edit:edit
            }
        });
    }

    addVisualization($event){
        console.log('add.$event',$event);
        let s = this.selectionFactory.newSelection($event.dragData);
        console.log('add.selection',s);
        let dialogRef = this.visDialog(s);
        dialogRef.afterClosed().subscribe(selection => {
            if(selection) {
                this.refuge.selections.push(selection);
                this.save();
            }
        });
    }

    editVisualization(s:VisSelection,$event) {
        $event.stopPropagation();
        let index = this.refuge.selections.indexOf(s);
        console.log(`edit.selection[${index}]`,s);
        let copy = this.selectionFactory.cloneSelection(s),
            dialogRef = this.visDialog(copy,true);
        dialogRef.afterClosed().subscribe(selection => {
            if(selection) {
                // replace
                this.refuge.selections[index] = selection;
                this.save();
            }
        });
    }

    isReordered() {
        if(this.guidOrder && this.guidOrder.length === this.refuge.selections.length) {
            return this.refuge.selections.reduce((reordered,s,i) => {
                return reordered||(s.guid !== this.guidOrder[i] ? true: false);
            },false);
        }
        return false;
    }

    reorderVisualizations() {
        setTimeout(() => {
            this.resizeAll();
        });
    }

    save(noSnackBar?:boolean) {
        this.refugeService.saveRefuge(this.refuge)
            .then(refuge => {
                this.setRefuge(refuge)
                if(!noSnackBar) {
                    this.snackBar.open('Visualizations saved',null,{duration:2000});
                }
            })
            .catch(e => this.handleError(e));
    }

    // capture where a selection was at drag start so it can be restored to its position
    // for undo trash
    dragStart($event) {
        // this seems inconstent but it seems that $event in the onDragStart/End
        // events is the dragData, unlike onDragSuccess
        this.dragStartIndex = $event ? this.refuge.selections.indexOf($event) : undefined;
        console.log('dragStart.$event',$event,this.dragStartIndex);
    }

    trashVisualization($event) {
        console.log('trash.$event',$event);
        let selection = $event.dragData,
            index = this.refuge.selections.indexOf(selection);
        console.log(`trashing selection ${index}`);
        this.refuge.selections.splice(index,1);
        this.refugeService.saveRefuge(this.refuge)
            .then(refuge => {
                this.setRefuge(refuge);
                this.snackBar.open('Visualization Deleted','Undo',{
                        duration: 5000,
                    }).onAction().subscribe(() => {
                        // issue because of the drag re-order selections normally get put back
                        // at index #1, may need to keep track of index on selection object
                        // change on resize or some such
                        index = typeof(this.dragStartIndex) !== 'undefined' ? this.dragStartIndex : index;
                        console.log(`restoring selection ${index}`);
                        this.refuge.selections.splice(index,0,this.selectionFactory.cloneSelection(selection));
                        this.save(true);
                    });
            })
            .catch(e => this.handleError(e));
    }

    handleError(e?:any) {
        console.error(e);
        this.snackBar.open('Something went wrong',null,{duration: 5000});
    }
}
