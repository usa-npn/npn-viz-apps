import { Component } from "@angular/core";
import { StoriesService, StoriesConfiguration } from './stories.service';
import { Observable } from 'rxjs';

@Component({
    template: `
    <div id="stories" *ngIf="configuration | async as cfg">
        <ul class="story-list" [ngStyle]="{background: 'url('+(cfg.backgroundImage||'assets/leaves.jpg')+')'}">
            <li class="story-wrapper" *ngFor="let story of cfg.stories">
                <div class="story" (click)="storiesService.visit(story)">
                    <div class="title">{{story.title}}</div>
                    <p class="tagline">{{story.tagline}}</p>
                </div>
            </li>
        </ul>
    </div>
    `
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