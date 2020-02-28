import {Component,OnInit,ElementRef,ViewChild, ViewEncapsulation} from '@angular/core';

import {FindingsComponent} from './findings.component';
import {EntityBase,EntityService, DashboardMode, DashboardModeState} from './entity.service';

import {MatTabChangeEvent} from '@angular/material';
import {faHandshake,faBook,faPaw,faSearch} from "@fortawesome/free-solid-svg-icons";

const WHAT_WERE_FINDING_TAB_IDX = 0;
const FOCAL_SPECIES_TAB_IDX = 1;
const RESOURCES_TAB_IDX = 2;
const PARTNERS_TAB_IDX = 3;

@Component({
  selector: 'fws-dashboard',
  template: `
  <mat-tab-group [ngClass]="{'entity-dashboard-tabs':true, 'three-tabs': !supportsPartners}" (selectedTabChange)="selectedTabChange($event)">
    <mat-tab label="What we're finding">
        <ng-template mat-tab-label>
            <div class="rd-tab-label findings">
                <mat-icon class="rd-tab-icon"><fa-icon [icon]="faSearch"></fa-icon></mat-icon>
                <label>What we're findingg</label>
            </div>
        </ng-template>
        <div class="rd-tab-content" *ngIf="renderVisualizations">
            <fws-dashboard-findings *ngIf="entity" [entity]="entity" [userIsAdmin]="userIsAdmin"></fws-dashboard-findings>
        </div>
    </mat-tab>

    <mat-tab label="Focal Species">
        <ng-template mat-tab-label>
            <div class="rd-tab-label focal-species">
                <mat-icon class="rd-tab-icon"><fa-icon [icon]="faPaw"></fa-icon></mat-icon>
                <label>Focal Species</label>
            </div>
        </ng-template>
        <div class="rd-tab-content" *ngIf="renderFocalSpecies">
            <focal-species [entity]="entity"></focal-species>
        </div>
    </mat-tab>

    <mat-tab label="Resources for observers">
        <ng-template mat-tab-label>
            <div class="rd-tab-label resources">
                <mat-icon class="rd-tab-icon"><fa-icon [icon]="faBook"></fa-icon></mat-icon>
                <label>Resources for observers</label>
            </div>
        </ng-template>
        <div class="rd-tab-content" *ngIf="renderResources">
            <fws-dashboard-resources [entity]="entity" [userIsLoggedIn]="userIsLoggedIn"></fws-dashboard-resources>
        </div>
    </mat-tab>

    <mat-tab label="Partners" *ngIf="supportsPartners">
        <ng-template mat-tab-label>
            <div class="rd-tab-label partners">
                <mat-icon class="rd-tab-icon"><fa-icon [icon]="faHandshake"></fa-icon></mat-icon>
                <label>Partners</label>
            </div>
        </ng-template>
        <div class="rd-tab-content" *ngIf="renderPartners">
        <phenology-trail-partners [entity]="entity"></phenology-trail-partners>
        </div>
    </mat-tab>
  </mat-tab-group>
  `,
  styleUrls: ['./fws-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class FwsDashboardComponent implements OnInit {
    entity_id:string;
    entity:EntityBase;
    userIsLoggedIn:boolean = false;
    userIsAdmin:boolean = false;
    dashboardMode:string = null;

    renderVisualizations:boolean = true;
    renderFocalSpecies:boolean = false;
    renderResources:boolean = false;
    supportsPartners:boolean = false;
    renderPartners:boolean = false;

    faHandshake = faHandshake;
    faBook = faBook;
    faPaw = faPaw;
    faSearch = faSearch;

    @ViewChild(FindingsComponent)
    private findingsComponent:FindingsComponent;

    constructor(private element:ElementRef,
                private entityService:EntityService) {
        let e = element.nativeElement as HTMLElement;
        this.entity_id = e.getAttribute('entity_id');
        this.userIsAdmin = e.getAttribute('user_is_admin') !== null;
        this.userIsLoggedIn = e.getAttribute('user_is_logged_in') !== null;
        DashboardModeState.set(e.getAttribute('mode') as DashboardMode);
        this.supportsPartners = DashboardModeState.get() === DashboardMode.PHENO_TRAIL;
    }

    ngOnInit() {
        this.entityService.get(this.entity_id).then(entity => this.entity = entity);
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
