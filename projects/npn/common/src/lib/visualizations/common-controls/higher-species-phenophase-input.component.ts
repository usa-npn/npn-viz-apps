import { MonitorsDestroy, SpeciesService, SpeciesPlot, TaxonomicSpeciesRank, SpeciesTaxonomicInfo, PhenophaseTaxonomicInfo } from '@npn/common/common';
import { Component, Output, EventEmitter, Input, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { VisSelection, BoundarySelection, StationAwareVisSelection } from '../vis-selection';
import { Subject, Observable, from, combineLatest, of } from 'rxjs';
import { switchMap, map, takeUntil, debounceTime, filter, tap } from 'rxjs/operators';
import { TaxonomicSpeciesTitlePipe } from '@npn/common/common/species-title.pipe';
import { HttpParams } from '@angular/common/http';
import { TaxonomicPhenophaseRank } from '@npn/common/common/phenophase';
import { SPECIES_PHENO_INPUT_COLORS } from './species-phenophase-input.component';
import { faInfoCircle } from '@fortawesome/pro-light-svg-icons';

/**
 * It would be nice if interfaces were actually meaningful at runtime.
 * Using concrete classes, due to getters/setters, could be problematic
 * SO WRT to validity of phenophases for date ranges this control works on 
 * convention rather than introspection as follows; plot.year, selection.year,
 * selection.years, selection.start/end (TODO).
 */
@Component({
    selector: 'higher-species-phenophase-input',
    template: `
    <mat-form-field class="species-rank-input">
        <mat-select [placeholder]="speciesTaxRankPlaceholder" [formControl]="speciesRank">
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
        <mat-hint *ngIf="showSpeciesHint" align="end"><fa-icon [icon]="speciesHintIcon" [matTooltip]="speciesHint"></fa-icon></mat-hint>
    </mat-form-field>
    <mat-form-field class="pheno-rank-input">
        <mat-select [placeholder]="phenoTaxRankPlaceholder" [formControl]="phenophaseRank">
            <mat-option *ngFor="let r of phenophaseRanks" [value]="r.rank">{{r.label}}</mat-option>
        </mat-select>
    </mat-form-field>
    <mat-form-field class="pheno-input">
        <mat-select [placeholder]="phenophasePlaceholder" [formControl]="phenophase">
            <mat-option *ngFor="let o of phenophaseList" [value]="o.item">{{o.label}}</mat-option>
        </mat-select>
        <mat-progress-bar *ngIf="fetchingPhenophaseList" mode="query"></mat-progress-bar>
    </mat-form-field>
    <mat-form-field *ngIf="gatherColor" class="color-input">
        <mat-select  [placeholder]="colorPlaceholder" [formControl]="color">
        <mat-select-trigger><div class="color-swatch" [ngStyle]="{'background-color':color.value}"></div></mat-select-trigger>
        <mat-option *ngFor="let c of colorList" [value]="c"><div class="color-swatch" [ngStyle]="{'background-color':c}"></div></mat-option>
        </mat-select>
    </mat-form-field>
<pre *ngIf="debug">
species={{speciesTaxInfo?.species.length | number}} classes={{speciesTaxInfo?.classes.length | number}} orders={{speciesTaxInfo?.orders.length | number}} families={{speciesTaxInfo?.families.length | number}}
phenophases={{phenophaseTaxInfo?.phenophases.length | number}} classes={{phenophaseTaxInfo?.classes.length | number}}
</pre>
    `,
    styles:[`
    .color-swatch {
        display: inline-block;
        width: 20px;
        height: 20px;
    }
    .color-input {
        width: 70px;
    }
    `]
})
export class HigherSpeciesPhenophaseInputComponent extends MonitorsDestroy {
    // TODO
    @Input() required:boolean = true;
    @Input() disabled:boolean = false;

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

    phenophaseRank:FormControl = new FormControl();
    phenophaseRanks = [{
        label: 'Phenophase',
        rank: TaxonomicPhenophaseRank.PHENOPHASE
    },{
        label: 'Class',
        rank: TaxonomicPhenophaseRank.CLASS
    }];

    phenophase:FormControl = new FormControl();
    fetchingPhenophaseList:boolean = false;
    phenophaseList:any[];
    phenophaseTaxInfo:PhenophaseTaxonomicInfo; // just for debug purposes

    @Input() gatherColor:boolean = false;
    color:FormControl = new FormControl();
    colorList:string[] = SPECIES_PHENO_INPUT_COLORS;

    private group:FormGroup;

    speciesHintIcon = faInfoCircle;

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
                        // strictly interested in station_id and not any other params a vis might send.
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
console.log('speciesTaxInfo',info);
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

        // whenever species changes go update the available phenophases/classes
        // TODO deal with years...
        const $phenophaseTaxInfo:Observable<PhenophaseTaxonomicInfo> = this.species.valueChanges.pipe(
            tap(() => this.fetchingPhenophaseList = true),
            switchMap(species => !!species
                ? from(this.speciesService.getAllPhenophases(species,this.speciesRank.value)
                    .then(phenos => this.speciesService.generatePhenophaseTaxonomicInfo(phenos)))
                : of(null)
            ),
            tap(() => this.fetchingPhenophaseList = false),
        );

        // when the in
        const $phenoListChange = combineLatest(
            $phenophaseTaxInfo,
            this.phenophaseRank.valueChanges
        ).pipe(
            map(input => {
                const [info,rank] = input;
                this.phenophaseTaxInfo = info
                if(info) {
                    switch(rank) {
                        case TaxonomicPhenophaseRank.PHENOPHASE:
                            return info.phenophases.map(item => ({
                                item,
                                label: item.phenophase_name
                            }));
                        case TaxonomicPhenophaseRank.CLASS:
                            return info.classes.map(item => ({
                                item,
                                label: item.pheno_class_name
                            }))
                    }
                }
                return [];
            }),
            tap(list => this.phenophaseList = list),
            takeUntil(this.componentDestroyed),
            
        );

        // pheno rank or species changes, need to check validity of phenophase if set
        combineLatest(
            this.species.valueChanges,
            $phenoListChange
        ).pipe(
            takeUntil(this.componentDestroyed)
        ).subscribe(input => {
            const [species,phenoList] = input;
            if(!species) {
                return this.phenophase.setValue(null);
            }
            const phenophase = this.phenophase.value;
            const rank = this.phenophaseRank.value;
            if(phenophase && phenoList.length) {
                const key = rank === TaxonomicPhenophaseRank.PHENOPHASE
                    ? 'phenophase_id'
                    : 'pheno_class_id';
                if(rank === TaxonomicPhenophaseRank.CLASS && phenophase.phenophase_id) {
                    // class but a phenophase selected, if this check didn't exist there's
                    // a very slight chance that an invalid selection could fall through
                    // the cracks since phenophases will have BOTH keys
                    return this.phenophase.setValue(null);
                }
                const id = phenophase[key];
                //console.log(`check pheno validity id=${id}`,phenophase,phenoList);
                if(!id) { // can't be valid, rank changed
                    return this.phenophase.setValue(null);
                }
                const valid = (phenoList as any[]).reduce((found,i) => (found||(i.item[key] === id ? i : null)),null);
                this.phenophase.setValue(valid ? valid.item : null);
            }
        });
       
        this.speciesRank.setValue((this.plot ? this.plot.speciesRank : null)||TaxonomicSpeciesRank.SPECIES);
        this.species.setValue(this.plot ? this.plot.species : null);
        this.phenophaseRank.setValue((this.plot ? this.plot.phenophaseRank : null)||TaxonomicPhenophaseRank.PHENOPHASE);
        this.phenophase.setValue(this.plot ? this.plot.phenophase : null);
        this.color.setValue(this.plot ? this.plot.color : null);

        // gather up any input changes and propagate them outward
        this.group = new FormGroup({
            speciesRank: this.speciesRank,
            species: this.species,
            phenophaseRank: this.phenophaseRank,
            phenophase: this.phenophase,
            color: this.color,
        });
        this.checkDisabled();
        this.checkRequired();
        this.group.valueChanges
            .pipe(
                //tap(v => console.log('selection changed',v)),
                // TODO expand the condition that decides when a plot is complete...
                map(v => !!v.speciesRank && !!v.species && typeof(v.species) === 'object'
                    && !!v.phenophaseRank && !!v.phenophase
                    && (!this.gatherColor || !!v.color)
                    ? v
                    : null
                ),
                takeUntil(this.componentDestroyed)
            )
            .subscribe(v => {
                // edit the plot in place, it may be a class
                this.plot.speciesRank = v ? v.speciesRank : null;
                this.plot.species = v ? v.species : null;
                this.plot.phenophaseRank = v ? v.phenophaseRank : null;
                this.plot.phenophase = v ? v.phenophase : null;
                if(this.gatherColor) {
                    this.plot.color = v ? v.color : null;
                } else {
                    delete this.plot.color; // just to be safe, mostly stesting
                }
                this.plotChange.next(this.plot);
            });
    }

    checkDisabled() {
        if(this.group) {
            if(this.disabled) {
                this.group.disable();
            } else {
                this.group.enable();
            }
        }
    }

    checkRequired() {
        if(this.group) {
            const validators = this.required
                ? [Validators.required]
                : null;
            Object.keys(this.group.controls).forEach(key => this.group.controls[key].setValidators(validators));
            this.group.updateValueAndValidity();
        }
    }

    ngOnChanges(changes:SimpleChanges) {
        if(changes.disabled) {
            this.checkDisabled();
        }
        if(changes.required) {
            this.checkRequired();
        }
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

    get speciesTaxRankPlaceholder():string {
        return 'Taxonomic rank'+(this.required ? ' *' : '');
    }

    get phenoTaxRankPlaceholder():string {
        return 'Phenophase taxonomic rank'+(this.required ? ' *' : '');
    }

    get speciesPlaceholder():string {
        const rank = this.speciesRank
            ? this.speciesRank.value as TaxonomicSpeciesRank
            : TaxonomicSpeciesRank.SPECIES;
        let label;
        switch(rank) {
            case TaxonomicSpeciesRank.SPECIES:
                label = 'Species';
                break;
            case TaxonomicSpeciesRank.CLASS:
                label = 'Class';
                break;
            case TaxonomicSpeciesRank.ORDER:
                label = 'Order';
                break;
            case TaxonomicSpeciesRank.FAMILY:
                label = 'Family';
                break;
        }
        return label+(this.required ? ' *' : '');
    }

    get phenophasePlaceholder():string {
        const rank = this.phenophaseRank
            ? this.phenophaseRank.value as TaxonomicPhenophaseRank
            : TaxonomicPhenophaseRank.PHENOPHASE;
        let label;
        switch(rank) {
            case TaxonomicPhenophaseRank.PHENOPHASE:
                label = 'Phenophase';
                break;
            case TaxonomicPhenophaseRank.CLASS:
                label = 'Class';
                break;
        }
        return label+(this.required ? ' *' : '');
    }

    get colorPlaceholder():string {
        return 'Color'+(this.required ? ' *' : '');
    }

    speciesFocus() {
        if(!this.species.value) {
            this.species.setValue(' ');
        }
    }

    get showSpeciesHint():boolean {
        const rank = this.speciesRank.value;
        const s = this.species.value;
        return rank === TaxonomicSpeciesRank.SPECIES && !!s
            && (typeof(s.class_common_name) === 'string' && typeof(s.class_name) === 'string')
            && (typeof(s.order_common_name) === 'string' && typeof(s.order_name) === 'string')
            && (typeof(s.family_common_name) === 'string' && typeof(s.family_name) === 'string');
    }

    get speciesHint():string {
        const species = this.species.value;
        const classDisplay = this.speciesTitle.transform(species,TaxonomicSpeciesRank.CLASS);
        const orderDisplay = this.speciesTitle.transform(species,TaxonomicSpeciesRank.ORDER);
        const familyDisplay = this.speciesTitle.transform(species,TaxonomicSpeciesRank.FAMILY);
        return `Class: "${classDisplay}" Order: "${orderDisplay}" Family: "${familyDisplay}"`;
    }

}