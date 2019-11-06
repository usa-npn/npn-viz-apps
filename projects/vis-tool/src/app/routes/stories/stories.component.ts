import { Component } from "@angular/core";
import { StoriesService, StoriesConfiguration } from './stories.service';
import { Observable } from 'rxjs';

@Component({
    template: `
    <div class="stories" *ngIf="configuration | async as cfg" [ngStyle]="{background: 'url('+(cfg.backgroundImage||'assets/leaves.jpg')+')'}">
        <mat-grid-list cols="2" rowHeight="160px" gutterSize="10px">
            <mat-grid-tile>
                <img class="story-npn-logo" src="assets/USA-NPN-logo-white-RGB2019.png" />
            </mat-grid-tile>
            <mat-grid-tile>
                <p class="vis-title">Visualization Tool</p>
            </mat-grid-tile>
        </mat-grid-list>
        <mat-grid-list cols="2" rowHeight="190px" gutterSize="20px">
            <!-- just to push other content down 
            <mat-grid-tile colspan="2">&nbsp;</mat-grid-tile> -->
            <mat-grid-tile *ngFor="let story of cfg.stories">
                <mat-card [ngStyle]="{'border-radius':'20px', 'opacity': 0.9, 'width': '100%', 'height': '100%', 'box-sizing': 'border-box'}">
                    <mat-card-title>{{story.title}}</mat-card-title>
                    <mat-card-subtitle>{{story.tagline}}</mat-card-subtitle>
                    <mat-card-actions align="end">
                        <geocode-zip *ngIf="story.external.$class === 'AgddTimeSeriesSelection'" [external]="story.external"></geocode-zip>
                        <button mat-button (click)="storiesService.visit(story)"
                            [disabled]="story.external.$class === 'AgddTimeSeriesSelection' && story.external.latLng?.length !== 2">See visualization</button>
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
    .vis-title {
        font-weight: bold;
        font-size: 60px;
        color: white;
    }
    .mat-card {
        display:flex;
        flex-direction: column;
    }
    .mat-card-header {
        flex-shrink: 0;
    }
    .mat-card-subtitle {
        flex-grow: 1;
        overflow: auto;
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