import {Component, Input, OnInit} from '@angular/core';

import {ObserverActivitySelection} from './observer-activity-selection';
import { CURRENT_YEAR, CURRENT_YEAR_LABEL } from '@npn/common/common';

@Component({
    selector: 'observer-activity-control',
    template:`
    <mat-form-field class="year-input">
        <mat-select placeholder="Year *" [(ngModel)]="selection.year" (ngModelChange)="selection.update()">
            <mat-option *ngFor="let y of validYears" [value]="y">{{y === CURRENT_YEAR ? CURRENT_YEAR_LABEL : y}}</mat-option>
        </mat-select>
    </mat-form-field>
    `,
    styles:[`
        .year-input {
            width: 90px;
        }
    `]
})
export class ObserverActivityControl implements OnInit {
    @Input()
    selection: ObserverActivitySelection;
    @Input()
    allowCurrentYear:boolean = false;
    CURRENT_YEAR = CURRENT_YEAR;
    CURRENT_YEAR_LABEL = CURRENT_YEAR_LABEL;

    validYears:number[] = [];

    ngOnInit() {
        this.validYears = (function(allowCurrentYear) {
            let thisYear = (new Date()).getFullYear(),
                years: number[] = [],
                c = 2000;
            while(c <= thisYear) {
                years.push(c++);
            }
            if(allowCurrentYear) {
                years.push(CURRENT_YEAR);
            }
            return years.reverse();
        })(this.allowCurrentYear);
    }
}
