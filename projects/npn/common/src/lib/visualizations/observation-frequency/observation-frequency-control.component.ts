import {Component, Input, OnInit} from '@angular/core';

import {ObservationFrequencySelection} from './observation-frequency-selection';
import { CURRENT_YEAR, CURRENT_YEAR_LABEL } from '../../common';

@Component({
    selector: 'observation-frequency-control',
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
export class ObservationFrequencyControl implements OnInit {
    @Input()
    selection: ObservationFrequencySelection;
    @Input()
    allowCurrentYear:boolean = false;
    CURRENT_YEAR = CURRENT_YEAR;
    CURRENT_YEAR_LABEL = CURRENT_YEAR_LABEL;
    
    validYears:number[] = [];

    ngOnInit() {
        this.validYears = (function(allowCurrentYear){
            let max = (new Date()).getFullYear()+1,
                current = 2000,
                years:number[] = [];
            while(current < max) {
                years.push(current++);
            }
            if(allowCurrentYear) {
                years.push(CURRENT_YEAR);
            }
            return years.reverse();
        })(this.allowCurrentYear);
    }
}
