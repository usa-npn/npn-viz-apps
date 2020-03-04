import { Component, OnInit, ElementRef, ViewEncapsulation } from '@angular/core';

import { RefugeService } from './refuge.service';

import { MatTabChangeEvent } from '@angular/material';

@Component({
    selector: 'spring-dashboard',
    template: `
  <mat-tab-group class="spring-dashboard-tabs" (selectedTabChange)="selectedTabChange($event)">
    <mat-tab>
        <ng-template mat-tab-label>
            <div class="spring-tab-label current-spring">
                <label>Current Status of Springs</label>
            </div>
        </ng-template>
        <div class="spring-tab-content">
            <status-of-spring></status-of-spring>
        </div>
    </mat-tab>
    <mat-tab>
        <ng-template mat-tab-label>
            <div class="spring-tab-label current-spring">
                <label>Long-term changes in the Start of Spring</label>
            </div>
        </ng-template>
        <div class="spring-tab-content">
            <start-of-spring></start-of-spring>
        </div>
    </mat-tab>
  </mat-tab-group>
  `,
    styleUrls: ['./spring-dashboard.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class SpringDashboardComponent implements OnInit {
    userIsLoggedIn: boolean = false;

    constructor(private element: ElementRef,
        private refugeService: RefugeService) {
        let e = element.nativeElement as HTMLElement;
        this.userIsLoggedIn = e.getAttribute('user_is_logged_in') !== null;
    }

    ngOnInit() {

    }

    selectedTabChange($event: MatTabChangeEvent) {
        console.debug('selectedTabChange', $event);
    }
}
