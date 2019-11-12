import {Component,OnInit,ElementRef,ViewChild, ViewEncapsulation} from '@angular/core';

import {FindingsComponent} from './findings.component';
import {Refuge,RefugeService} from './refuge.service';

import {MatTabChangeEvent} from '@angular/material';

const WHAT_WERE_FINDING_TAB_IDX = 0;
const FOCAL_SPECIES_TAB_IDX = 1;
const RESOURCES_TAB_IDX = 2;
const PARTNERS_TAB_IDX = 3;

@Component({
  selector: 'fws-dashboard',
  template: `
  <mat-tab-group class="refuge-dashboard-tabs" (selectedTabChange)="selectedTabChange($event)">
    <mat-tab label="What we're finding">
        <ng-template mat-tab-label>
            <div class="rd-tab-label findings">
                <label>What we're finding</label>
            </div>
        </ng-template>
        <div class="rd-tab-content" *ngIf="renderVisualizations">
            <refuge-findings *ngIf="refuge" [refuge]="refuge" [userIsAdmin]="userIsAdmin"></refuge-findings>
        </div>
    </mat-tab>

    <mat-tab label="Focal Species">
        <ng-template mat-tab-label>
            <div class="rd-tab-label focal-species">
                <label>Focal Species</label>
            </div>
        </ng-template>
        <div class="rd-tab-content" *ngIf="renderFocalSpecies">
            <focal-species [refuge]="refuge"></focal-species>
        </div>
    </mat-tab>

    <mat-tab label="Resources for observers">
        <ng-template mat-tab-label>
            <div class="rd-tab-label resources">
                <label>Resources for observers</label>
            </div>
        </ng-template>
        <div class="rd-tab-content" *ngIf="renderResources">
            <refuge-resources [refuge]="refuge" [userIsLoggedIn]="userIsLoggedIn"></refuge-resources>
        </div>
    </mat-tab>

    <mat-tab label="Resources for observers">
        <ng-template mat-tab-label>
            <div class="rd-tab-label resources">
                <label>Partners</label>
            </div>
        </ng-template>
        <div class="rd-tab-content" *ngIf="renderPartners">
            TODO partners implementation
        </div>
    </mat-tab>
  </mat-tab-group>
  `,
  styleUrls: ['./fws-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class FwsDashboardComponent implements OnInit {
    refuge_id:string;
    refuge:Refuge;
    userIsLoggedIn:boolean = false;
    userIsAdmin:boolean = false;

    renderVisualizations:boolean = true;
    renderFocalSpecies:boolean = false;
    renderResources:boolean = false;
    renderPartners:boolean = false;

    @ViewChild(FindingsComponent)
    private findingsComponent:FindingsComponent;

    constructor(private element:ElementRef,
                private refugeService:RefugeService) {
        let e = element.nativeElement as HTMLElement;
        this.refuge_id = e.getAttribute('refuge_id');
        this.userIsAdmin = e.getAttribute('user_is_admin') !== null;
        this.userIsLoggedIn = e.getAttribute('user_is_logged_in') !== null;
    }

    ngOnInit() {
        this.refugeService.getRefuge(this.refuge_id).then(refuge => this.refuge = refuge);
    }

    selectedTabChange($event:MatTabChangeEvent) {
        this.renderFocalSpecies = this.renderFocalSpecies||($event.index === FOCAL_SPECIES_TAB_IDX);
        // lazily render the visualizations, only once visiting their tab
        this.renderVisualizations = this.renderVisualizations||($event.index === WHAT_WERE_FINDING_TAB_IDX);
        this.renderResources = this.renderResources||($event.index === RESOURCES_TAB_IDX);
        this.renderPartners = this.renderPartners||($event.index === PARTNERS_TAB_IDX);
        if($event.index === WHAT_WERE_FINDING_TAB_IDX) {
            // if the visualizations are selected makes ure that resizeAll() is called
            // in case the browser was re-sized AFTER the visualizations were visited but
            // while another tab was visible (the visualizations would have resized themselves down to nothing).
            setTimeout(() => {
                if(this.findingsComponent) {
                    this.findingsComponent.resizeAll();
                }
            });
        }
    }
}
