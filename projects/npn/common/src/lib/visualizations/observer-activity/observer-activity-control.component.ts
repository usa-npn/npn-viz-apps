import {Component, Input, OnInit} from '@angular/core';

import {ObserverActivitySelection} from './observer-activity-selection';

@Component({
    selector: 'observer-activity-control',
    template:`
    <mat-form-field class="year-input">
        <mat-select placeholder="Year *" [(ngModel)]="selection.year" (change)="selection.update()">
            <mat-option *ngFor="let y of validYears" [value]="y">{{y}}</mat-option>
        </mat-select>
    </mat-form-field>
    `,
    styles:[`
        .year-input {
            width: 65px;
        }
    `]
})
export class ObserverActivityControl implements OnInit {
    @Input()
    selection: ObserverActivitySelection;

    // TODO what are the valid years?
    validYears:number[] = (function(){
        let max = (new Date()).getFullYear()+1,
            current = 2000,
            years:number[] = [];
        while(current < max) {
            years.push(current++);
        }
        return years.reverse();
    })();

    ngOnInit() {

    }
}
