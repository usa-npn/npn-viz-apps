import { Injectable } from '@angular/core';
import { DatePipe } from '@angular/common';

import { HttpParams } from '@angular/common/http';

import { Species } from './species';
import { Phenophase } from './phenophase';
import { NpnServiceUtils } from './npn-service-utils.service';

@Injectable()
export class SpeciesService {
    constructor(private serviceUtils:NpnServiceUtils,private datePipe: DatePipe) {}

    getAllSpecies(params?: any): Promise<Species[]> {
        // NOTE: when there are multiple species phenophase controls on the screen the result can
        // be multiple simultaneous queries...
        console.log('SpeciesService.getAllSpecies:params', params)
        const url = this.serviceUtils.apiUrl('/npn_portal/species/getSpeciesFilter.json');
        let postParams = new HttpParams()
        Object.keys(params).forEach(key => postParams = postParams.set(`${key}`, `${params[key]}`));
        return this.serviceUtils.cachedPost(url,postParams.toString());
    }

    private _getPhenophases(species: Species, date?: Date): Promise<Phenophase[]> {
        const url = this.serviceUtils.apiUrl('/npn_portal/phenophases/getPhenophasesForSpecies.json');
        const params: any = { species_id: species.species_id };
        if (date) {
            params.date = this.datePipe.transform(date, 'y-MM-dd')
        } else {
            params.return_all = true;
        }
        return this.serviceUtils.cachedGet(url,params)
            .then(phases => this.removeRedundantPhenophases(phases[0].phenophases as Phenophase[]));
    }

    getAllPhenophases(species: Species): Promise<Phenophase[]> {
        return this._getPhenophases(species);
    }

    getPhenophasesForDate(species: Species, date: Date): Promise<Phenophase[]> {
        return this._getPhenophases(species, date);
    }

    getPhenophasesForYear(species: Species, year: number) {
        let jan1 = new Date(year, 0, 1),
            dec31 = new Date(year, 11, 31);
        return Promise.all([
            this.getPhenophasesForDate(species, jan1),
            this.getPhenophasesForDate(species, dec31)
        ]).then(lists => this.mergeRedundantPhenophaseLists(lists));
    }

    getPhenophasesForYears(species: Species, startYear: number, endYear: number): Promise<Phenophase[]> {
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
        return Promise.all(years.map(y => this.getPhenophasesForYear(species, y)))
                .then(lists => this.mergeRedundantPhenophaseLists(lists));
    }

    getPhenophases(species: Species, startYear?: number, endYear?: number): Promise<Phenophase[]> {
        return startYear ?
            this.getPhenophasesForYears(species, startYear, endYear) :
            this.getAllPhenophases(species);
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
