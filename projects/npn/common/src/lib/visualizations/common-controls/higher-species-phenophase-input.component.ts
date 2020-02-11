import { Component, Output, EventEmitter, Input, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { VisSelection, NetworkAwareVisSelection } from '../vis-selection';
import { Subject, Observable, from, combineLatest, of } from 'rxjs';
import { switchMap, map, takeUntil, debounceTime, filter, tap } from 'rxjs/operators';
import { MonitorsDestroy,
         SpeciesService,
         SpeciesPlot,
         TaxonomicSpeciesRank,
         SpeciesTaxonomicInfo,
         PhenophaseTaxonomicInfo,
         TaxonomicSpeciesTitlePipe,
         TaxonomicPhenophaseRank,
         STATIC_COLORS } from '../../common';
import { HttpParams } from '@angular/common/http';
import { faInfoCircle } from '@fortawesome/pro-light-svg-icons';

export interface HigherSpeciesPhenophaseInputCriteria {
    years?: number[];
    stationIds?: Promise<number []>;
}

/**
 * Filtering of applicable species is based upon the `criteria` input.
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
        <mat-hint *ngIf="showSpeciesHint" align="end"><fa-icon [icon]="hintIcon" [matTooltip]="speciesHint"></fa-icon></mat-hint>
    </mat-form-field>
    <mat-form-field class="pheno-input">
        <mat-select [placeholder]="phenophasePlaceholder" [formControl]="phenophase">
            <mat-option *ngFor="let o of phenophaseList" [value]="o.item">{{o.label}}</mat-option>
        </mat-select>
        <mat-progress-bar *ngIf="fetchingPhenophaseList" mode="query"></mat-progress-bar>
        <mat-hint *ngIf="phenophaseHint" align="end"><fa-icon [icon]="hintIcon" [matTooltip]="phenophaseHint"></fa-icon></mat-hint>
    </mat-form-field>
    <mat-form-field *ngIf="actuallyGatherColor" class="color-input">
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
    @Input() required:boolean = true;
    @Input() disabled:boolean = false;
    
    private criteriaUpdate:Subject<HigherSpeciesPhenophaseInputCriteria> = new Subject();
    _criteria:HigherSpeciesPhenophaseInputCriteria;

    @Input() debug:boolean = false;
    @Input() selection:VisSelection; // for access to network args
    @Input() plot:SpeciesPlot;
    @Output() plotChange = new EventEmitter<SpeciesPlot>();

    speciesRank:FormControl = new FormControl();
    speciesRanks = [{
        label: 'Species',
        rank: TaxonomicSpeciesRank.SPECIES
    },{
        label: 'Genus',
        rank: TaxonomicSpeciesRank.GENUS
    },{
        label: 'Family',
        rank: TaxonomicSpeciesRank.FAMILY
    },{
        label: 'Order',
        rank: TaxonomicSpeciesRank.ORDER
    },{
        label: 'Class',
        rank: TaxonomicSpeciesRank.CLASS
    }
    ];
    species:FormControl = new FormControl();
    fetchingSpeciesList:boolean = false;
    speciesList:any[];
    $filteredSpeciesList:Observable<any []>;
    speciesLabel; // closure for translating species items to strings.
    speciesTaxInfo:SpeciesTaxonomicInfo; // just for debug purposes

    phenophase:FormControl = new FormControl();
    fetchingPhenophaseList:boolean = false;
    phenophaseList:any[];
    phenophaseHint;
    phenophaseTaxInfo:PhenophaseTaxonomicInfo; // just for debug purposes

    ignoreGatherColor:boolean = false;
    /**
     * Whether or not to gather color and set on the plot
     * This input is ignored if the selection is an instanceof NetworkAwareVisSelection
     * and is using grouping.  In that scenario visualizations will need to calculate
     * colors based on groups.length*plots.length.
     */
    @Input() gatherColor:boolean = false;
    color:FormControl = new FormControl();
    colorList:string[] = STATIC_COLORS;

    private group:FormGroup;

    hintIcon = faInfoCircle;

    constructor(
        private speciesService:SpeciesService,
        public speciesTitle:TaxonomicSpeciesTitlePipe
    ) {
        super();
        this.speciesLabel = item => this.speciesTitle.transform(item,this.speciesRank.value);
    }

    ngOnInit() {
        this.criteriaUpdate
            .pipe(takeUntil(this.componentDestroyed))
            .subscribe(() => this.ignoreGatherColor =
                (this.selection instanceof NetworkAwareVisSelection &&
                 !!this.selection.groups &&
                 this.selection.groups.length > 0));

        const $speciesTaxonomicInfo:Observable<SpeciesTaxonomicInfo> = this.criteriaUpdate.pipe(
            tap(() => this.fetchingSpeciesList = true),
            switchMap(criteria => from((criteria.stationIds||Promise.resolve([])).then(stationIds => {
                        let params = new HttpParams();
                        (stationIds||[]).forEach((id,idx) => params = params.set(`station_ids[${idx}]`,`${id}`))
                        return params;
                    })).pipe(
                        switchMap(params => this.speciesService.getAllSpeciesHigher(params,criteria.years, this.selection.groupId, this.selection.personId))
                    )),
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
                    case TaxonomicSpeciesRank.GENUS:
                        return info.genera; // TODO: make sure this works, KW just made genus plural
                }
                throw new Error(`Invalid species rank "${rank}"`);
            }),
            takeUntil(this.componentDestroyed)
        ).subscribe((list:any[]) => {
            const rank = this.speciesRank.value as TaxonomicSpeciesRank;
            const species = this.species.value as any;
            this.speciesList = list.map(item => {
                const label = this.speciesLabel(item);
                const lower = label.toLowerCase();
                return {item,label,lower};
            });
            if(rank !== TaxonomicSpeciesRank.SPECIES) {
                this.speciesList.sort((a,b) => a.label.localeCompare(b.label));
            }
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
                    case TaxonomicSpeciesRank.GENUS:
                        if(!species.genus_id || !!species.species_id) {
                            this.species.setValue(null);
                        }
                        break;
                }
            } else {
                this.species.setValue(null);
            }
        });

        // whenever species changes go update the available phenophases/classes
        // TODO deal with station_ids?
        const $phenophaseTaxInfo:Observable<PhenophaseTaxonomicInfo> = combineLatest(
            this.species.valueChanges,
            this.criteriaUpdate.pipe(debounceTime(500)),
        ).pipe(
            tap(() => this.fetchingPhenophaseList = true),
            switchMap(input => {
console.log('$phenophaseTaxInfo.input',input);
                const [species,criteria] = input;
                return !!species && typeof(species) === 'object'
                ? from(
                    (criteria.years && criteria.years.length
                    ? this.speciesService.getPhenodefinitionsForYears(species,this.speciesRank.value,criteria.years)
                    : this.speciesService.getAllPhenodefinitions(species,this.speciesRank.value))
                    .then(phenos => this.speciesService.generatePhenophaseTaxonomicInfo(phenos)))
                : of(null)
            }),
            tap(() => this.fetchingPhenophaseList = false),
        );

        // when the in
        const $phenoListChange = $phenophaseTaxInfo.pipe(
            map(info => {
                this.phenophaseTaxInfo = info
                if(info) {
console.log('phenophaseTaxInfo',info);
                    return info.classes.map(item => ({
                        item,
                        label: item.pheno_class_name
                    }));
                }
                return [];
            }),
            tap(list => this.phenophaseList = list),
            takeUntil(this.componentDestroyed),
        );

        //  species or list of phenophases changed, need to check validity of phenophase if set
        combineLatest(
            this.species.valueChanges,
            $phenoListChange
        ).pipe(
            takeUntil(this.componentDestroyed)
        ).subscribe(input => {
            const [species,phenoList] = input;
            if(!species) {
                if(this.phenophase.enabled) {
                    this.phenophase.disable({emitEvent:false});
                }
                return this.phenophase.setValue(null);
            }
            if(this.phenophase.disabled) {
                this.phenophase.enable({emitEvent:false});
            }
            const phenophase = this.phenophase.value;
            if(phenophase && phenoList.length) {
                const key = 'pheno_class_id';
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
        this.phenophase.setValue(this.plot ? this.plot.phenophase : null);
        this.color.setValue(this.plot ? this.plot.color : null);

        combineLatest(
            this.phenophase.valueChanges,
            $phenophaseTaxInfo
        ).pipe(
            takeUntil(this.componentDestroyed)
        ).subscribe((input:any[]) => {
            const [pheno,list] = input;
            this.phenophaseHint = (!!pheno && !!list && !!list.phenophases && list.phenophases.length)
                ? ('Phenophases included: ' + list.phenophases
                    .filter(pp => pheno.pheno_class_id == pp.pheno_class_id) // phenophases of class
                    .sort((a,b) => a.seq_num - b.seq_num)
                    .map(pp => pp.phenophase_name.trim()) // map t name
                    .reduce((arr,ppn) => { // eliminate any duplicate names
                        if(arr.indexOf(ppn) === -1) {
                            arr.push(ppn);
                        }
                        return arr;
                    },[])
                    .join(', '))
                : undefined;
        });

        // gather up any input changes and propagate them outward
        this.group = new FormGroup({
            speciesRank: this.speciesRank,
            species: this.species,
            phenophase: this.phenophase,
            color: this.color,
        });
        this.checkDisabled();
        this.checkRequired();
        this.criteriaUpdate.next(this.criteria||{});
        this.group.valueChanges
            .pipe(
                //tap(v => console.log('selection changed',v)),
                // TODO expand the condition that decides when a plot is complete...
                map(v => !!v.speciesRank && !!v.species && typeof(v.species) === 'object'
                    && !!v.phenophase
                    && (!this.actuallyGatherColor || !!v.color)
                    ? v
                    : null
                ),
                takeUntil(this.componentDestroyed)
            )
            .subscribe(v => {
                //setTimeout(() => {
                    // edit the plot in place, it may be a class
                    this.plot.speciesRank = v ? v.speciesRank : null;
                    this.plot.species = v ? v.species : null;
                    this.plot.phenophaseRank = TaxonomicPhenophaseRank.CLASS;
                    this.plot.phenophase = v ? v.phenophase : null;
                    if(this.actuallyGatherColor) {
                        this.plot.color = v ? v.color : null;
                    } else {
                        delete this.plot.color; // just to be safe, mostly stesting
                    }
                    this.plotChange.next(this.plot);
                //});
            });
    }

    @Input()
    set criteria(c:HigherSpeciesPhenophaseInputCriteria) {
        this.criteriaUpdate.next(this._criteria = c);
    }

    get criteria():HigherSpeciesPhenophaseInputCriteria {
        return this._criteria;
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

    ngOnDestroy() {
        super.ngOnDestroy();
        this.criteriaUpdate.complete();
    }

    get speciesTaxRankPlaceholder():string {
        return 'Taxonomic rank'+(this.required ? ' *' : '');
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
            case TaxonomicSpeciesRank.GENUS:
                label = 'Genus';
                break;
        }
        return label + (!this.fetchingPhenophaseList && (this.speciesList||[]).length ? ` (${(this.speciesList||[]).length})` : '') + (this.required ? ' *' : '');
    }

    get phenophasePlaceholder():string {
        return 'Phenophase class' /*+ ((this.phenophaseList||[]).length ? ` (${(this.phenophaseList||[]).length})`: '')*/ + (this.required ? ' *' : '');
    }

    get actuallyGatherColor():boolean {
        return this.gatherColor && !this.ignoreGatherColor;
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
        const genusDisplay = this.speciesTitle.transform(species,TaxonomicSpeciesRank.GENUS);
        return `Class: "${classDisplay}" Order: "${orderDisplay}" Family: "${familyDisplay}" Genus: "${genusDisplay}`;
    }

}