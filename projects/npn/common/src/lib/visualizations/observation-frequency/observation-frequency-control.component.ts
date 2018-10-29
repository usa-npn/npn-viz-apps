import {Component, Input, OnInit} from '@angular/core';

import {ObservationFrequencySelection} from './observation-frequency-selection';

@Component({
    selector: 'observation-frequency-control',
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
export class ObservationFrequencyControl implements OnInit {
    @Input()
    selection: ObservationFrequencySelection;

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
