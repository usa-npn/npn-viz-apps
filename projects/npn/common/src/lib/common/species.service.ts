import { Injectable } from '@angular/core';
import { DatePipe } from '@angular/common';

import { HttpParams } from '@angular/common/http';

import { Species, TaxonomicSpecies, TaxonomicClass, TaxonomicFamily, TaxonomicOrder, TaxonomicSpeciesRank, TaxonomicSpeciesType } from './species';
import { Phenophase, TaxonomicPhenophaseRank, PhenophaseClass } from './phenophase';
import { NpnServiceUtils } from './npn-service-utils.service';

export interface SpeciesTaxonomicInfo {
    species: TaxonomicSpecies[];
    classes?: TaxonomicClass[];
    orders?: TaxonomicOrder[];
    families?: TaxonomicFamily[];
}

export interface PhenophaseTaxonomicInfo {
    phenophases: Phenophase[];
    classes: PhenophaseClass[];
}

/**
 * @todo need utilities that can be used to generate keys from plot and data based on the plot.
 */
export interface SpeciesPlot {
    /** Dictates what IS found in the `species` property.  If not specified defaults to SPECIES (legacy) */
    speciesRank?: TaxonomicSpeciesRank;
    species?: TaxonomicSpeciesType;
    /** Dictates what IS found in the `phenophase` property.  If not specified defaults to PHENOPHASE (legacy) */
    phenophaseRank?: TaxonomicPhenophaseRank;
    phenophase?: Phenophase|PhenophaseClass;
    /** Many plots have colors associated with them */
    color?: string;
    /** Some plots may be for an individual year */
    year?: number;
}

export interface SpeciesPlotKeys {
    speciesIdKey: string;
    phenophaseIdKey: string;
}

/**
 * @param plot The plot
 * @return {SpeciesPlotKeys} The names of the id keys associated with data records.
 */
export function getSpeciesPlotKeys(plot:SpeciesPlot):SpeciesPlotKeys {
    let speciesIdKey;
    let phenophaseIdKey;
    switch(plot.speciesRank||TaxonomicSpeciesRank.SPECIES) {
        case TaxonomicSpeciesRank.SPECIES:
            speciesIdKey = 'species_id';
            break;
        case TaxonomicSpeciesRank.CLASS:
            speciesIdKey = 'class_id';
            break;
        case TaxonomicSpeciesRank.ORDER:
            speciesIdKey = 'order_id';
            break;
        case TaxonomicSpeciesRank.FAMILY:
            speciesIdKey = 'family_id';
            break;           
    }
    switch(plot.phenophaseRank||TaxonomicPhenophaseRank.PHENOPHASE) {
        case TaxonomicPhenophaseRank.PHENOPHASE:
            phenophaseIdKey = 'phenophase_id';
            break;
        case TaxonomicPhenophaseRank.CLASS:
            phenophaseIdKey = 'pheno_class_id';
            break;
    }
    return {speciesIdKey,phenophaseIdKey};
}

function mapByNumericId(list,key) {
    return list.reduce((map,o) => {
            if(typeof(o[key]) === 'number') {
                map[o[key]] = o;
            }
            return map;
        },{});
}
@Injectable()
export class SpeciesService {
    constructor(private serviceUtils:NpnServiceUtils,private datePipe: DatePipe) {}

    getAllSpecies(params?: any): Promise<Species[]> {
        // NOTE: when there are multiple species phenophase controls on the screen the result can
        // be multiple simultaneous queries...
        //console.log('SpeciesService.getAllSpecies:params', params);
        params = params||{};
        const url = this.serviceUtils.apiUrl('/npn_portal/species/getSpeciesFilter.json');
        let postParams = new HttpParams()
        Object.keys(params).forEach(key => postParams = postParams.set(`${key}`, `${params[key]}`));
        return this.serviceUtils.cachedPost(url,postParams.toString());
    }

    private higherSpeciesCache = {};
    getAllSpeciesHigher(params:HttpParams = new HttpParams()): Promise<SpeciesTaxonomicInfo> {
        // don't store these results in the session cache, they can get large
        params = params.set('include_restricted','false');
        const input = params.toString();
        const cacheKey = this.serviceUtils.cache.cacheKey(input);
        if(this.higherSpeciesCache[cacheKey]) {
            return this.higherSpeciesCache[cacheKey];
        }
        // NOTE: when there are multiple species phenophase controls on the screen the result can
        // be multiple simultaneous queries...
        //console.log('SpeciesService.getAllSpeciesHigher:params', params);
        return this.higherSpeciesCache[cacheKey] = this.serviceUtils.post(
                this.serviceUtils.apiUrl('/npn_portal/species/getSpecies.json'),
                input
            )
            .then((species:TaxonomicSpecies[]) => {
                const gatherById = key => mapByNumericId(species,key);
                const classIds = gatherById('class_id');
                const orderIds = gatherById('order_id');
                const familyIds = gatherById('family_id');
                return {
                    species,
                    classes: Object.keys(classIds).map(id => {
                            const {class_id,class_name,class_common_name,kingdom} = classIds[id];
                            return {class_id,class_name,class_common_name,kingdom}
                        })
                        .filter(r => !!r.class_id && !!r.class_name/* && !!r.class_common_name*/) // keep only complete records
                        /*.sort((a,b) => a.class_common_name.localeCompare(b.class_common_name))*/,
                    orders: Object.keys(orderIds).map(id => {
                            const {order_id,order_name,order_common_name,kingdom} = orderIds[id];
                            return {order_id,order_name,order_common_name,kingdom};
                        })
                        .filter(r => !!r.order_id && !!r.order_name/* && !!r.order_common_name*/) // keep only complete records
                        /*.sort((a,b) => a.order_common_name.localeCompare(b.order_common_name))*/,
                    families: Object.keys(familyIds).map(id => {
                            const {family_id,family_name,family_common_name,kingdom} = familyIds[id];
                            return {family_id,family_name,family_common_name,kingdom};
                        })
                        .filter(r => !!r.family_id && !!r.family_name/* && !!r.family_common_name*/) // keep only complete records
                        /*.sort((a,b) => a.family_common_name.localeCompare(b.family_common_name))*/
                };
            });
    }

    /**
     * Flatten a list of SpeciesPlots into the list of species_ids that they constitute.
     * 
     * @param plots 
     * @return {Promise<number []>} Promise resolved with the set of species_ids.
     */
    getSpeciesIds(plots:SpeciesPlot[]):Promise<number []> {
        return this.getAllSpeciesHigher()
            .then(info => plots.reduce((ids,plot) => {
                const addId = id => {
                    if(ids.indexOf(id) === -1) {
                        ids.push(id);
                    }
                };
                const keys = getSpeciesPlotKeys(plot);
                let taxId;
                switch(plot.speciesRank||TaxonomicSpeciesRank.SPECIES) {
                    case TaxonomicSpeciesRank.SPECIES:
                        taxId = (plot.species as Species).species_id;
                        break;
                    case TaxonomicSpeciesRank.CLASS:
                        taxId = (plot.species as TaxonomicClass).class_id;
                        break;
                    case TaxonomicSpeciesRank.ORDER:
                        taxId = (plot.species as TaxonomicOrder).order_id;
                        break;
                    case TaxonomicSpeciesRank.FAMILY:
                        taxId = (plot.species as TaxonomicFamily).family_id;
                        break;
                }
                // pull out all species that match and add them to the set
                info.species.filter(species => species[keys.speciesIdKey] == taxId)
                    .forEach(species => addId(species.species_id));
                return ids;
            },[]));
    }

    generatePhenophaseTaxonomicInfo(phenophases:Phenophase[]):PhenophaseTaxonomicInfo {
        const phenoClassIds = mapByNumericId(phenophases,'pheno_class_id');
        return {
            phenophases,
            classes: Object.keys(phenoClassIds).map(id => {
                    const {pheno_class_id,pheno_class_name} = phenoClassIds[id];
                    return {pheno_class_id,pheno_class_name};
                })
                .filter(r => !!r.pheno_class_id && !!r.pheno_class_name)
                .sort((a,b) => a.pheno_class_name.localeCompare(b.pheno_class_name))
        };
    }

    private _getPhenophases(species: TaxonomicSpeciesType, rank: TaxonomicSpeciesRank, date?: Date): Promise<Phenophase[]> {
        const params: any = {};
        const url = rank === TaxonomicSpeciesRank.SPECIES
            ? this.serviceUtils.apiUrl('/npn_portal/phenophases/getPhenophasesForSpecies.json')
            : this.serviceUtils.apiUrl('/npn_portal/phenophases/getPhenophasesForTaxon.json')
        let o;
        switch(rank) {
            case TaxonomicSpeciesRank.SPECIES:
                o = species as Species;
                params.species_id = o.species_id;
                break;
            case TaxonomicSpeciesRank.CLASS:
                o = species as TaxonomicClass;
                params.class_id = o.class_id;
                break;
            case TaxonomicSpeciesRank.ORDER:
                o = species as TaxonomicOrder;
                params.order_id = o.order_id;
                break;
            case TaxonomicSpeciesRank.FAMILY:
                o = species as TaxonomicFamily;
                params.family_id = o.family_id;
                break;
        }
        if (date) {
            params.date = this.datePipe.transform(date, 'y-MM-dd')
        } else {
            params.return_all = true;
        }
        return this.serviceUtils.cachedGet(url,params)
            .then(phases => phases && phases.length
                ? this.removeRedundantPhenophases(phases[0].phenophases as Phenophase[])
                : []);
    }

    getAllPhenophases(species: TaxonomicSpeciesType, rank:TaxonomicSpeciesRank): Promise<Phenophase[]> {
        return this._getPhenophases(species,rank);
    }

    getPhenophasesForDate(species: TaxonomicSpeciesType, rank:TaxonomicSpeciesRank, date: Date): Promise<Phenophase[]> {
        return this._getPhenophases(species, rank, date);
    }

    getPhenophasesForYear(species: TaxonomicSpeciesType, rank:TaxonomicSpeciesRank, year: number) {
        let jan1 = new Date(year, 0, 1),
            dec31 = new Date(year, 11, 31);
        return Promise.all([
            this.getPhenophasesForDate(species, rank, jan1),
            this.getPhenophasesForDate(species, rank, dec31)
        ]).then(lists => this.mergeRedundantPhenophaseLists(lists));
    }

    getPhenophasesForYears(species: TaxonomicSpeciesType, rank:TaxonomicSpeciesRank, years:number[]): Promise<Phenophase[]> {
        return Promise.all(years.map(y => this.getPhenophasesForYear(species, rank, y)))
                .then(lists => this.mergeRedundantPhenophaseLists(lists));
    }

    getPhenophasesContiguousYears(species: TaxonomicSpeciesType, rank:TaxonomicSpeciesRank, startYear?: number, endYear?: number): Promise<Phenophase[]> {
        if(startYear) {
            if (startYear && !endYear) {
                throw new Error('Missing end year.');
            }
            if (startYear > endYear) {
                throw new Error('start year cannot be greater than end');
            }
            let years = [startYear], i = startYear;
            while (i++ < endYear) {
                years.push(i);
            }
            return this.getPhenophasesForYears(species,rank,years);
        }
        return this.getAllPhenophases(species,rank);
    }

    private removeRedundantPhenophases(list) {
        let seen = [];
        return list.filter(function (pp) {
            if (seen[pp.phenophase_id]) {
                return false;
            }
            seen[pp.phenophase_id] = pp;
            return true;
        });
    }
    private mergeRedundantPhenophaseLists(lists) {
        return this.removeRedundantPhenophases(
            lists.reduce(function (arr, l) {
                return arr.concat(l);
            }, []));
    }
}
