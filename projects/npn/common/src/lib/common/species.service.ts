import { Injectable } from '@angular/core';
import { DatePipe } from '@angular/common';

import { HttpParams } from '@angular/common/http';

import { Species, TaxonomicSpecies, TaxonomicClass, TaxonomicFamily, TaxonomicOrder, TaxonomicSpeciesRank, TaxonmicSpeciesType } from './species';
import { Phenophase, TaxonomicPhenophaseRank, PhenophaseClass } from './phenophase';
import { NpnServiceUtils } from './npn-service-utils.service';

export interface SpeciesTaxonomicInfo {
    species: TaxonomicSpecies[];
    classes?: TaxonomicClass[];
    orders?: TaxonomicOrder[];
    families?: TaxonomicFamily[];
}

/**
 * @todo need utilities that can be used to generate keys from plot and data based on the plot.
 */
export interface SpeciesPlot {
    /** Dictates what IS found in the `species` property.  If not specified defaults to SPECIES (legacy) */
    speciesRank?: TaxonomicSpeciesRank;
    species?: TaxonmicSpeciesType;
    /** Dictates what IS found in the `phenophase` property.  If not specified defaults to PHENOPHASE (legacy) */
    phenophaseRank?: TaxonomicPhenophaseRank;
    phenophase?: Phenophase|PhenophaseClass;
    /** Many plots have colors associated with them */
    color?: string;
    /** Some plots may be for an individual year */
    year?: number;
}

@Injectable()
export class SpeciesService {
    constructor(private serviceUtils:NpnServiceUtils,private datePipe: DatePipe) {}

    getAllSpecies(params?: any): Promise<Species[]> {
        // NOTE: when there are multiple species phenophase controls on the screen the result can
        // be multiple simultaneous queries...
        console.log('SpeciesService.getAllSpecies:params', params);
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
        console.log('SpeciesService.getAllSpeciesHigher:params', params);
        return this.higherSpeciesCache[cacheKey] = this.serviceUtils.post(
                this.serviceUtils.apiUrl('/npn_portal/species/getSpecies.json'),
                input
            )
            .then((species:TaxonomicSpecies[]) => {
                const gatherById = key => species
                        .reduce(( map,s) => {
                            /*if(/maple/i.test(s.common_name)) {
                                console.log('MAPLE',s);
                            }*/
                            if(typeof(s[key]) === 'number') {
                                map[s[key]] = s;
                            }/* else {
                                console.warn(`${key} is not a number`,s);
                            }*/
                            return  map;
                        },{});
                const classIds = gatherById('class_id');
                const orderIds = gatherById('order_id');
                const familyIds = gatherById('family_id');
                const info = {
                    species,
                    classes: Object.keys(classIds).map(id => {
                            const {class_id,class_name,class_common_name} = classIds[id];
                            return {class_id,class_name,class_common_name}
                        })
                        .filter(r => !!r.class_id && !!r.class_name && !!r.class_common_name) // keep only complete records
                        .sort((a,b) => a.class_common_name.localeCompare(b.class_common_name)),
                    orders: Object.keys(orderIds).map(id => {
                            const {order_id,order_name,order_common_name} = orderIds[id];
                            return {order_id,order_name,order_common_name};
                        })
                        .filter(r => !!r.order_id && !!r.order_name && !!r.order_common_name) // keep only complete records
                        .sort((a,b) => a.order_common_name.localeCompare(b.order_common_name)),
                    families: Object.keys(familyIds).map(id => {
                            const {family_id,family_name,family_common_name} = familyIds[id];
                            return {family_id,family_name,family_common_name};
                        })
                        .filter(r => !!r.family_id && !!r.family_name && !!r.family_common_name) // keep only complete records
                        .sort((a,b) => a.family_common_name.localeCompare(b.family_common_name))
                };
                return info;
            });
    }

    private _getPhenophases(species: TaxonmicSpeciesType, rank: TaxonomicSpeciesRank, date?: Date): Promise<Phenophase[]> {
        const url = this.serviceUtils.apiUrl('/npn_portal/phenophases/getPhenophasesForSpecies.json');
        const params: any = {};
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
            .then(phases => this.removeRedundantPhenophases(phases[0].phenophases as Phenophase[]));
    }

    getAllPhenophases(species: TaxonmicSpeciesType, rank:TaxonomicSpeciesRank): Promise<Phenophase[]> {
        return this._getPhenophases(species,rank);
    }

    getPhenophasesForDate(species: TaxonmicSpeciesType, rank:TaxonomicSpeciesRank, date: Date): Promise<Phenophase[]> {
        return this._getPhenophases(species, rank, date);
    }

    getPhenophasesForYear(species: TaxonmicSpeciesType, rank:TaxonomicSpeciesRank, year: number) {
        let jan1 = new Date(year, 0, 1),
            dec31 = new Date(year, 11, 31);
        return Promise.all([
            this.getPhenophasesForDate(species, rank, jan1),
            this.getPhenophasesForDate(species, rank, dec31)
        ]).then(lists => this.mergeRedundantPhenophaseLists(lists));
    }

    getPhenophasesForYears(species: TaxonmicSpeciesType, rank:TaxonomicSpeciesRank, years:number[]): Promise<Phenophase[]> {
        return Promise.all(years.map(y => this.getPhenophasesForYear(species, rank, y)))
                .then(lists => this.mergeRedundantPhenophaseLists(lists));
    }

    getPhenophasesContiguousYears(species: TaxonmicSpeciesType, rank:TaxonomicSpeciesRank, startYear?: number, endYear?: number): Promise<Phenophase[]> {
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
