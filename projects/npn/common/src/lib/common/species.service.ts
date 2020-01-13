import { Injectable } from '@angular/core';
import { DatePipe } from '@angular/common';

import { HttpParams } from '@angular/common/http';

import { Species, TaxonomicSpecies, TaxonomicClass, TaxonomicFamily, TaxonomicGenus, TaxonomicOrder, TaxonomicSpeciesRank, TaxonomicSpeciesType } from './species';
import { Phenophase, TaxonomicPhenophaseRank, PhenophaseClass } from './phenophase';
import { NpnServiceUtils } from './npn-service-utils.service';

export interface SpeciesTaxonomicInfo {
    species: TaxonomicSpecies[];
    classes?: TaxonomicClass[];
    orders?: TaxonomicOrder[];
    families?: TaxonomicFamily[];
    genera?: TaxonomicGenus[];
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
        case TaxonomicSpeciesRank.GENUS:
            speciesIdKey = 'genus_id';
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

    // all species related results are cached locally but not in the session cache since they can get large
    private higherSpeciesCache = {};

    private _allSpecies(params:HttpParams = new HttpParams()): Promise<TaxonomicSpecies[]> {
        params = params.set('include_restricted','false');
        const input = params.toString();
        const cacheKey = this.serviceUtils.cache.cacheKey({service:'getSpecies',input});
        if(!this.higherSpeciesCache[cacheKey]) {
            return this.higherSpeciesCache[cacheKey] = this.serviceUtils.post(
                this.serviceUtils.apiUrl('/npn_portal/species/getSpecies.json'),
                input
            );
        }
        return this.higherSpeciesCache[cacheKey].then(results => JSON.parse(JSON.stringify(results)));
    }

    private _filterSpecies(params:HttpParams = new HttpParams()): Promise<TaxonomicSpecies[]> {
        const input = params.toString();
        const cacheKey = this.serviceUtils.cache.cacheKey({service:'getSpeciesFilter',input});
        if(!this.higherSpeciesCache[cacheKey]) {
            return this.higherSpeciesCache[cacheKey] = this.serviceUtils.post(
                this.serviceUtils.apiUrl('/npn_portal/species/getSpeciesFilter.json'),
                input
            );
        }
        return this.higherSpeciesCache[cacheKey].then(results => JSON.parse(JSON.stringify(results)));
    }

    private _allSpeciesPromises(params:HttpParams = new HttpParams(),years:number[] = [], networkId = null): Promise<TaxonomicSpecies[]>[] {
        if(networkId != null) {
            params = params.set('network_id', networkId);
        }
        years = years||[]; // in case null is actually passed in
        // if we aren't doing any filtering then use the getSpecies service because
        // it's much faster for that use case, it just doesn't return numbers of observations
        if(!years.length && !params.keys().length) {
            return [this._allSpecies(params)];
        }
        return !years.length
            ? [this._filterSpecies(params)]
            // sets of input request parameters for filtering
            // e.g. [2013,2010,2012] ->
            // [['2010-01-01','2010-12-31'],['2012-01-01','2013-12-31']]
            : years.slice().sort().reduce((rngs,year) => {
                    if(!rngs.length) {
                        rngs[0] = [year,year];
                    } else {
                        const rng = rngs[rngs.length-1];
                        if(rng[1] === year-1) {
                            rng[1] = year;
                        } else {
                            rngs.push([year,year]);
                        }
                    }
                    return rngs;
                },[])
                //.map(range => [`${range[0]}-01-01`,`${range[1]}-12-31`])
                .map(range => this._filterSpecies(params.set('start_date',`${range[0]}-01-01`).set('end_date',`${range[1]}-12-31`)));
    }

    getAllSpeciesConsolidated(params:HttpParams = new HttpParams(),years:number[] = null, networkId = null): Promise<TaxonomicSpecies[]> {
        return Promise.all(this._allSpeciesPromises(params,years,networkId))
            .then((results:TaxonomicSpecies[][]) => {
                console.log('getAllSpeciesConsolidated.results',results.map(r => r.length).join(', '));
                let consolidated:TaxonomicSpecies[];
                if(results.length === 1) {
                    consolidated = results[0]; // nothing to consolidate
                } else {
                    const idMap = {};
                    consolidated = results.reduce((set,list) => {
                        list.forEach(species => {
                            const {species_id} = species;
                            if(idMap[species_id]) {
                                // already in set, bump observation count
                                //console.log(`getAllSpeciesConsolidated.consolidating species observations [${species_id}] ${idMap[species_id].number_observations} + ${species.number_observations}`);
                                idMap[species_id].number_observations += species.number_observations;
                            } else {
                                set.push(idMap[species_id] = species);
                            }
                        });
                        return set;
                    },[])
                }
                if(consolidated.length && typeof(consolidated[0].number_observations) === 'number') {
                    // sort by number_observations
                    consolidated.sort((a,b) => b.number_observations - a.number_observations);
                }
                console.log('getAllSpeciesConsolidated.consolidated',consolidated.length);
                return consolidated;
            });
    }

    getAllSpeciesHigher(params:HttpParams = new HttpParams(),years:number[] = null,networkId = null): Promise<SpeciesTaxonomicInfo> {
        return this.getAllSpeciesConsolidated(params,years,networkId)
            .then((species:TaxonomicSpecies[]) => {
                const gatherById = key => mapByNumericId(species,key);
                const classIds = gatherById('class_id');
                const orderIds = gatherById('order_id');
                const familyIds = gatherById('family_id');
                const genusIds = gatherById('genus_id');

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
                        /*.sort((a,b) => a.family_common_name.localeCompare(b.family_common_name))*/,
                    genera: Object.keys(genusIds).map(id => {
                        const {genus_id,genus,genus_common_name, kingdom} = genusIds[id];
                        return {genus_id,genus,genus_common_name, kingdom};
                    })
                    .filter(r => !!r.genus_id && !!r.genus/* && !!r.family_common_name*/) // keep only complete records
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
                    case TaxonomicSpeciesRank.GENUS:
                        taxId = (plot.species as TaxonomicGenus).genus_id;
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
                    const {pheno_class_id,pheno_class_name,pheno_class_sequence} = phenoClassIds[id];
                    return {pheno_class_id,pheno_class_name,pheno_class_sequence};
                })
                .filter(r => !!r.pheno_class_id && !!r.pheno_class_name)
                .sort((a,b) => {
                    if(a.pheno_class_sequence > b.pheno_class_sequence) {
                        return 1;
                    } else if(a.pheno_class_sequence < b.pheno_class_sequence) {
                        return -1;
                    } else {
                        return 0;
                    }
                })
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
            case TaxonomicSpeciesRank.GENUS:
                o = species as TaxonomicGenus;
                params.genus_id = o.genus_id;
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

    private _getPhenodefinitions(species: TaxonomicSpeciesType, rank: TaxonomicSpeciesRank, date?: Date): Promise<Phenophase[]> {
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
            case TaxonomicSpeciesRank.GENUS:
                o = species as TaxonomicGenus;
                params.genus_id = o.genus_id;
                break;
        }
        
        if (date) {
            params.date = this.datePipe.transform(date, 'y-MM-dd')
        } else {
            params.return_all = true;
        }
        return this.serviceUtils.cachedGet(url,params)
            .then(phases => phases && phases.length
                ? this.removeRedundantPhenodefinitions(phases[0].phenophases as Phenophase[])
                : []);
    }

    getAllPhenophases(species: TaxonomicSpeciesType, rank:TaxonomicSpeciesRank): Promise<Phenophase[]> {
        return this._getPhenophases(species,rank);
    }

    getAllPhenodefinitions(species: TaxonomicSpeciesType, rank:TaxonomicSpeciesRank): Promise<Phenophase[]> {
        return this._getPhenodefinitions(species,rank);
    }

    getPhenophasesForDate(species: TaxonomicSpeciesType, rank:TaxonomicSpeciesRank, date: Date): Promise<Phenophase[]> {
        return this._getPhenophases(species, rank, date);
    }

    getPhenodefinitionsForDate(species: TaxonomicSpeciesType, rank:TaxonomicSpeciesRank, date: Date): Promise<Phenophase[]> {
        return this._getPhenodefinitions(species, rank, date);
    }

    getPhenophasesForYear(species: TaxonomicSpeciesType, rank:TaxonomicSpeciesRank, year: number) {
        let jan1 = new Date(year, 0, 1),
            dec31 = new Date(year, 11, 31);
        return Promise.all([
            this.getPhenophasesForDate(species, rank, jan1),
            this.getPhenophasesForDate(species, rank, dec31)
        ]).then(lists => this.mergeRedundantPhenophaseLists(lists));
    }

    getPhenodefinitionsForYear(species: TaxonomicSpeciesType, rank:TaxonomicSpeciesRank, year: number) {
        let jan1 = new Date(year, 0, 1),
            dec31 = new Date(year, 11, 31);
        return Promise.all([
            this.getPhenodefinitionsForDate(species, rank, jan1),
            this.getPhenodefinitionsForDate(species, rank, dec31)
        ]).then(lists => this.mergeRedundantPhenodefinitionLists(lists));
    }

    getPhenophasesForYears(species: TaxonomicSpeciesType, rank:TaxonomicSpeciesRank, years:number[]): Promise<Phenophase[]> {
        return Promise.all(years.map(y => this.getPhenophasesForYear(species, rank, y)))
                .then(lists => this.mergeRedundantPhenophaseLists(lists));
    }

    getPhenodefinitionsForYears(species: TaxonomicSpeciesType, rank:TaxonomicSpeciesRank, years:number[]): Promise<Phenophase[]> {
        return Promise.all(years.map(y => this.getPhenodefinitionsForYear(species, rank, y)))
                .then(lists => this.mergeRedundantPhenodefinitionLists(lists));
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

    private removeRedundantPhenodefinitions(list){
        let seen = {};
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

    private mergeRedundantPhenodefinitionLists(lists) {
        return this.removeRedundantPhenodefinitions(
            lists.reduce(function (arr, l) {
                return arr.concat(l);
            }, []));
    }
}
