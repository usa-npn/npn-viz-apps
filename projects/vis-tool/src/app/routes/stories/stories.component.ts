import { Component } from "@angular/core";
import { StoriesService, StoriesConfiguration } from './stories.service';
import { Observable } from 'rxjs';

@Component({
    template: `
    <div class="stories" *ngIf="configuration | async as cfg" [ngStyle]="{background: 'url('+(cfg.backgroundImage||'assets/leaves.jpg')+')'}">
        <div class='header-wrapper'>
            <div class="header-card">
                <img class="story-npn-logo" src="assets/USA-NPN-logo-white-RGB2019.png" />
                <p class="vis-title">Visualization Tool</p>
            </div>
        </div>
        <mat-grid-list cols="2" rowHeight="190px" gutterSize="20px">
            <!-- just to push other content down 
            <mat-grid-tile colspan="2">&nbsp;</mat-grid-tile> -->
            <mat-grid-tile *ngFor="let story of cfg.stories">
                <mat-card class="story-card">
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
        background-size: cover !important;
    }
    .stories mat-grid-list {
        width: 95%;
        margin: auto;
    }
    .stories mat-card {
        width: 100%;
    }
    .stories mat-card-title {
        font-size: 20px;
        font-weight: bold;
    }
    .vis-title {
        padding: 15px;
        font-weight: bold;
        font-size: 60px;
        color: white;
        line-height: 60px;
    }
    .mat-card {
        display:flex;
        flex-direction: column;
    }
    .story-card {
        padding: 10px;
        padding-bottom: 20px;
        border-radius: 20px;
        opacity: 0.9;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
    }
    .mat-card-header {
        flex-shrink: 0;
    }
    .mat-card-subtitle {
        color: black !important;
        flex-grow: 1;
        overflow: auto;
    }
    .story-npn-logo {
        height: 100px;
    }
    .header-card {
        padding: 10px;
        background: rgba(0,0,0,0.6);
        border-radius: 20px;
        display:flex;
        flex-direction: row;
        justify-content: space-around;
        align-items: center;
        text-align: center;
        vertical-align: middle;
        flex-wrap: wrap;
    }
    .header-wrapper {
        padding: 25px;
    }
    @media (max-width: 1024px) {
        .story-card {
            padding: 4px;
            padding-bottom: 10px;
        }
        .stories mat-card-title {
            font-size: 10px;
            font-weight: bold;
        }
        .stories mat-card-subtitle {
            font-size: 10px;
        }
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
