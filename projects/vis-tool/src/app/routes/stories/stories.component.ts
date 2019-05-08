import { Component } from "@angular/core";
import { StoriesService, StoriesConfiguration } from './stories.service';
import { Observable } from 'rxjs';

@Component({
    template: `
    <div class="stories" *ngIf="configuration | async as cfg" [ngStyle]="{background: 'url('+(cfg.backgroundImage||'assets/leaves.jpg')+')'}">
        <mat-grid-list cols="2" rowHeight="150px" gutterSize="20px">
            <!-- just to push other content down -->
            <mat-grid-tile colspan="2">&nbsp;</mat-grid-tile>
            <mat-grid-tile *ngFor="let story of cfg.stories">
                <mat-card>
                    <mat-card-title>{{story.title}}</mat-card-title>
                    <mat-card-subtitle>{{story.tagline}}</mat-card-subtitle>
                    <mat-card-actions>
                        <button mat-button (click)="storiesService.visit(story)">See visualization</button>
                    </mat-card-actions>
                </mat-card>
            </mat-grid-tile>
        </mat-grid-list>
    </div>
    `,
    styles:[`
    .stories {
        width: 100%;
        height: 100%;
        background-size: cover;
    }
    .stories mat-grid-list {
        width: 95%;
        margin: auto;
    }
    .stories mat-card {
        width: 100%;
    }
    `]
})
export class StoriesComponent {
    configuration:Observable<StoriesConfiguration>;

    constructor(
        public storiesService:StoriesService
    ) {}

    ngOnInit() {
      this.configuration = this.storiesService.getConfiguration();
    }
}