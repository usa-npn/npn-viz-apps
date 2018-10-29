import { Component, Output, EventEmitter } from "@angular/core";
import { RefugeService, Refuge } from "./refuge.service";
import { FormControl } from "@angular/forms";
import { Observable } from "rxjs";
import { filter, map, takeUntil } from 'rxjs/operators';


@Component({
    selector: 'refuge-control',
    template: `
    <mat-form-field *ngIf="refuges" class="refuges-input">
        <input matInput [placeholder]="selected ? 'Refuge' : 'Find a refuge'" [formControl]="control" [matAutocomplete]="auto" />
        <mat-autocomplete #auto="matAutocomplete" [displayWith]="refugeTitle">
            <mat-option *ngFor="let refuge of filteredRefuges | async" [value]="refuge">{{ refuge.title }}</mat-option>
        </mat-autocomplete>
    </mat-form-field>
    `,
    styleUrls:['./refuge-control.component.scss']
})
export class RefugeControl {
    control:FormControl = new FormControl();
    refuges:Refuge[];
    selected:Refuge;
    filteredRefuges:Observable<Refuge[]>;
    @Output() onSelect: EventEmitter<Refuge> = new EventEmitter();
    @Output() onList: EventEmitter<Refuge[]> = new EventEmitter();

    constructor(protected refugeService:RefugeService){}

    ngOnInit() {
        this.refugeService.refugeList().pipe(
                map(list => list.filter(refuge => !!refuge.location)) // just in case any don't have location set
            ).subscribe(list => this.onList.emit(this.refuges = list));
        // TODO takeUntil
        this.control.valueChanges.pipe(
                filter(r => !r || typeof(r) === 'object'), // includes null
                filter(r => !(this.selected && r === this.selected)), // don't re-deliver
                map(r => (r && typeof(r) === 'object') ? r : null)
            ) .subscribe((refuge:Refuge) => this.onSelect.emit(this.selected = refuge));
        // TODO takeUntil
        this.filteredRefuges = this.control.valueChanges.pipe(
                filter(r => typeof(r) === 'string'),
                map(s => s ? this._filterRefuges(s) : (this.refuges ? this.refuges.slice() : []))
            );
    }

    refugeTitle(refuge:Refuge) {
        return refuge ? refuge.title : '';
    }
    _filterRefuges(val:string):Refuge[] {
        if(!this.refuges) {
            return [];
        }
        val = val.toLowerCase();
        return this.refuges.filter(r => r.title.toLowerCase().indexOf(val) !== -1);
    }
}