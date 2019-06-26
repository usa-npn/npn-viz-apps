import { MonitorsDestroy, SpeciesService, SpeciesTitlePipe, SpeciesPlot, TaxonomicSpeciesRank, SpeciesTaxonomicInfo, TaxonomicClass, TaxonomicOrder, TaxonomicFamily, Species } from '@npn/common/common';
import { Component, Output, EventEmitter, Input } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { VisSelection, BoundarySelection, StationAwareVisSelection } from '../vis-selection';
import { Subject, Observable, from, combineLatest } from 'rxjs';
import { switchMap, map, takeUntil, debounceTime, filter, tap } from 'rxjs/operators';
import { TaxonomicSpeciesTitlePipe } from '@npn/common/common/species-title.pipe';
import { HttpParams } from '@angular/common/http';

/**
 * It would be nice if interfaces were actually meaningful at runtime.
 * Using concrete classes, due to getters/setters, could be problematic
 * SO WRT to validity of phenophases for date ranges this control works on 
 * convention rather than introspection as follows; plot.year, selection.year,
 * selection.years, selection.start/end
 */
@Component({
    selector: 'higher-species-phenophase-input',
    template: `
    <mat-form-field class="species-rank-input">
        <mat-select placeholder="Taxonomic rank" [formControl]="speciesRank">
            <mat-option *ngFor="let r of speciesRanks" [value]="r.rank">{{r.label}}</mat-option>
        </mat-select>
    </mat-form-field>
    <mat-form-field class="species-input">
        <input matInput [placeholder]="speciesPlaceholder" aria-label="Species"
            [matAutocomplete]="sp"
            [formControl]="species" (focus)="speciesFocus()" />
        <mat-autocomplete #sp="matAutocomplete" [displayWith]="speciesLabel">
            <mat-option *ngFor="let o of $filteredSpeciesList | async" [value]="o.item">
              {{o.label}}
            </mat-option>
        </mat-autocomplete>
        <mat-progress-bar *ngIf="fetchingSpeciesList" mode="query"></mat-progress-bar>
    </mat-form-field>
<pre *ngIf="debug">species={{speciesTaxInfo?.species.length | number}} classes={{speciesTaxInfo?.classes.length | number}} orders={{speciesTaxInfo?.orders.length | number}} families={{speciesTaxInfo?.families.length | number}}</pre>
    `
})
export class HigherSpeciesPhenophaseInputComponent extends MonitorsDestroy {
    private selectionUpdate:Subject<VisSelection> = new Subject();
    @Input() debug:boolean = false;
    @Input() selection:VisSelection; // for access to network args
    @Input() plot:SpeciesPlot;
    @Output() plotChange = new EventEmitter<SpeciesPlot>();

    speciesRank:FormControl = new FormControl();
    speciesRanks = [{
        label: 'Species',
        rank: TaxonomicSpeciesRank.SPECIES
    },{
        label: 'Class',
        rank: TaxonomicSpeciesRank.CLASS
    },{
        label: 'Order',
        rank: TaxonomicSpeciesRank.ORDER
    },{
        label: 'Family',
        rank: TaxonomicSpeciesRank.FAMILY
    }];
    species:FormControl = new FormControl();
    fetchingSpeciesList:boolean = false;
    speciesList:any[];
    $filteredSpeciesList:Observable<any []>;
    speciesLabel; // closure for translating species items to strings.

    speciesTaxInfo:SpeciesTaxonomicInfo; // just for debug purposes

    

    constructor(
        private speciesService:SpeciesService,
        public speciesTitle:TaxonomicSpeciesTitlePipe
    ) {
        super();
        this.speciesLabel = item => this.speciesTitle.transform(item,this.speciesRank.value);
    }

    ngOnInit() {
        const $speciesTaxonomicInfo:Observable<SpeciesTaxonomicInfo> = this.selectionUpdate.pipe(
            tap(() => this.fetchingSpeciesList = true),
            switchMap(selection => {
                if(selection instanceof StationAwareVisSelection) {
                    return from(selection.toURLSearchParams().then(allParams => {
                        // strictly interested in station_id and not any other params
                        // a vis might send.
                        let params = new HttpParams();
                        allParams.keys()
                            .filter(k => /^station_id/.test(k))
                            .forEach(k => params = params.set(k,allParams.get(k)))
                        return params;
                    })).pipe(
                        switchMap(params => this.speciesService.getAllSpeciesHigher(params))
                    );
                }
                return this.speciesService.getAllSpeciesHigher() 
            }),
            tap(() => this.fetchingSpeciesList = false)
        );
        combineLatest(
            this.speciesRank.valueChanges,
            $speciesTaxonomicInfo
        ).pipe(
            filter(input => !!input[0] && !!input[1]),
            map(input => {
                const [rank,info] = input;
                this.speciesTaxInfo = info;
                switch(rank) {
                    case TaxonomicSpeciesRank.SPECIES:
                        return info.species;
                    case TaxonomicSpeciesRank.CLASS:
                        return info.classes;
                    case TaxonomicSpeciesRank.ORDER:
                        return info.orders;
                    case TaxonomicSpeciesRank.FAMILY:
                        return info.families;
                }
                throw new Error(`Invalid species rank "${rank}"`);
            }),
            takeUntil(this.componentDestroyed)
        ).subscribe((list:any[]) => {
            this.speciesList = list.map(item => {
                const label = this.speciesLabel(item);
                const lower = label.toLowerCase();
                return {item,label,lower};
            });
            this.$filteredSpeciesList = this.species.valueChanges.pipe(
                debounceTime(500),
                filter(s => typeof(s) === 'string'),
                map(s => {
                    if(s && this.speciesList) {
                        s = s.trim().toLowerCase();
                        return this.speciesList.filter(o => o.lower.indexOf(s) !== -1);
                    }
                    return this.speciesList
                        ? this.speciesList.slice()
                        : [];
                })
            );
            // clear the current value if it is no longer valid
            const rank = this.speciesRank.value as TaxonomicSpeciesRank;
            const species = this.species.value as any;
            if(species) {
                switch(rank) {
                    case TaxonomicSpeciesRank.SPECIES:
                        if(!species.species_id) {
                            this.species.setValue(null);
                        }
                        break;
                    case TaxonomicSpeciesRank.CLASS:
                        if(!species.class_id || !!species.species_id) {
                            this.species.setValue(null);
                        }
                        break;
                    case TaxonomicSpeciesRank.ORDER:
                        if(!species.order_id || !!species.species_id) {
                            this.species.setValue(null);
                        }
                        break;
                    case TaxonomicSpeciesRank.FAMILY:
                        if(!species.family_id || !!species.species_id) {
                            this.species.setValue(null);
                        }
                        break;
                }
            } else {
                this.species.setValue(null);
            }
        });
        
        this.speciesRank.setValue(this.plot ? this.plot.speciesRank : TaxonomicSpeciesRank.SPECIES);
        this.species.setValue(this.plot ? this.plot.species : null);

        // gather up any input changes and propagate them outward
        const group = new FormGroup({
            speciesRank: this.speciesRank,
            species: this.species
        });
        group.valueChanges
            .pipe(
                // TODO expand the condition that decides when a plot is complete...
                map(v => !!v.speciesRank && !!v.species && typeof(v.species) === 'object'
                    ? v
                    : null
                ),
                takeUntil(this.componentDestroyed)
            )
            .subscribe(v => this.plotChange.next(this.plot = v));
    }

    private bootstrapped:boolean = false;
    private boundaries:BoundarySelection[];
    ngDoCheck() {
        if(!this.bootstrapped) {
            if(this.selection instanceof StationAwareVisSelection) {
                this.boundaries = this.selection.boundaries;
            }
            this.selectionUpdate.next(this.selection);
            this.bootstrapped = true;
        } else if (this.selection instanceof StationAwareVisSelection) {
            const bounds = this.selection.boundaries;
            if(bounds !== this.boundaries && !(!bounds.length && !this.boundaries.length)) {
                this.boundaries = bounds;
                this.selectionUpdate.next(this.selection);
            }
        }
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        this.selectionUpdate.complete();
    }

    get speciesPlaceholder():string {
        const rank = this.speciesRank
            ? this.speciesRank.value as TaxonomicSpeciesRank
            : TaxonomicSpeciesRank.SPECIES;
        switch(rank) {
            case TaxonomicSpeciesRank.SPECIES:
                return 'Species';
            case TaxonomicSpeciesRank.CLASS:
                return 'Class';
            case TaxonomicSpeciesRank.ORDER:
                return 'Order';
            case TaxonomicSpeciesRank.FAMILY:
                return 'Family';
        }
    }

    speciesFocus() {
        if(!this.species.value) {
            this.species.setValue(' ');
        }
    }


}