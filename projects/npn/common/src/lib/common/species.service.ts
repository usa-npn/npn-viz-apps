import { Injectable, Inject } from '@angular/core';
import { DatePipe } from '@angular/common';

import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import 'rxjs/add/operator/toPromise';

import { CacheService } from './cache-service';
import { Species } from './species';
import { Phenophase } from './phenophase';
import { NpnConfiguration, NPN_CONFIGURATION } from './config';

const HEADERS = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });

@Injectable()
export class SpeciesService {
    constructor(private http: HttpClient,
        private cache: CacheService,
        private datePipe: DatePipe,
        @Inject(NPN_CONFIGURATION) private config: NpnConfiguration) {
    }

    getAllSpecies(params?: any): Promise<Species[]> {
        // NOTE: when there are multiple species phenophase controls on the screen the result can
        // be multiple simultaneous queries...
        return new Promise((resolve, reject) => {
            console.log('SpeciesService.getAllSpecies:params', params)
            let url = `${this.config.apiRoot}/npn_portal/species/getSpeciesFilter.json`,
                cacheKey = {
                    u: url,
                    params: params
                },
                data: Species[] = this.cache.get(cacheKey);
            if (data) {
                resolve(data);
            } else {
                let uParams = new HttpParams()
                Object.keys(params).forEach(key => uParams.set(`${key}`, `${params[key]}`));
                this.http.post<Species[]>(url, uParams.toString(), { headers: HEADERS })
                    .toPromise()
                    .then(data => {
                        this.cache.set(cacheKey, data);
                        resolve(data);
                    })
                    .catch(reject);
            }
        });
    }

    private _getPhenophases(species: Species, date?: Date): Promise<Phenophase[]> {
        return new Promise((resolve, reject) => {
            let url = `${this.config.apiRoot}/npn_portal/phenophases/getPhenophasesForSpecies.json`,
                params: any = {
                    species_id: species.species_id
                };
            if (date) {
                params.date = this.datePipe.transform(date, 'y-MM-dd')
            } else {
                params.return_all = true;
            }
            let cacheKey = {
                u: url,
                params: params
            },
                data: Phenophase[] = this.cache.get(cacheKey);
            if (data) {
                resolve(data);
            } else {
                this.http.get<any[]>(url, { params: params })
                    .toPromise()
                    .then(phases => {
                        data = phases[0].phenophases as Phenophase[];
                        data = this.removeRedundantPhenophases(data);
                        this.cache.set(cacheKey, data);
                        resolve(data);
                    })
                    .catch(reject);
            }
        });
    }

    getAllPhenophases(species: Species): Promise<Phenophase[]> {
        return this._getPhenophases(species);
    }

    getPhenophasesForDate(species: Species, date: Date): Promise<Phenophase[]> {
        return this._getPhenophases(species, date);
    }

    getPhenophasesForYear(species: Species, year: number) {
        return new Promise((resolve, reject) => {
            let jan1 = new Date(year, 0, 1),
                dec31 = new Date(year, 11, 31);
            Promise.all([
                this.getPhenophasesForDate(species, jan1),
                this.getPhenophasesForDate(species, dec31)
            ]).then(lists => {
                resolve(this.mergeRedundantPhenophaseLists(lists));
            })
                .catch(reject);
        });
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
        return new Promise((resolve, reject) => {
            Promise.all(years.map(y => this.getPhenophasesForYear(species, y)))
                .then(lists => {
                    resolve(this.mergeRedundantPhenophaseLists(lists));
                })
                .catch(reject);
        });
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
