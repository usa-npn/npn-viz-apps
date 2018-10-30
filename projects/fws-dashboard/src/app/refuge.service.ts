import {Injectable} from '@angular/core';

import {HttpClient} from '@angular/common/http';

import {CacheService,VisualizationSelectionFactory,VisSelection} from '@npn/common';

import {MockRefuge} from './mock-refuge';

// this means that the app can no longer function outside of the context of Drupal, period.
const API_ROOT = '/api/refuge';

@Injectable()
export class RefugeService {
    constructor(private http: HttpClient,
                protected cacheService: CacheService,
                protected selectionFactory: VisualizationSelectionFactory) {
    }

    parseSelections(json:string):VisSelection[] {
        let selections = this.selectionFactory.newSelections(JSON.parse(json));
        /*
        console.log('JSON',json);
        console.log('SELECTIONS',selections);
        */
        return selections;
    }

    private refugeUrl(refuge_id) {
        return `${API_ROOT}/${refuge_id}`;
    }

    private castRefuge(refuge_id,refuge:any):Refuge {
        refuge.id = refuge_id;
        let selections = (refuge.selections||[]).map(s => JSON.parse(s));
        refuge.selections = this.selectionFactory.newSelections(selections);
        return refuge as Refuge;
    }

    refugeList():Promise<any> {
        return this.http.get(`${API_ROOT}`)
                .toPromise()
                .then(refuges => Object.keys(refuges).map(key => ({
                        id: key,
                        title: refuges[key].title
                    })) // firebase returns a keyed map of them all.
                );
    }

    getRefuge(refuge_id):Promise<Refuge> {
        return this.http.get(this.refugeUrl(refuge_id))
                .toPromise()
                .then(response => this.castRefuge(refuge_id,response));
    }

    saveRefuge(refuge:Refuge):Promise<Refuge> {
        let r = {...{},...refuge} as any;
        r.selections = (r.selections||[]).map(s => JSON.stringify(s.external) );
        let json = JSON.stringify(r);
        console.log(`JSON ${json}`);
        return this.http.put(this.refugeUrl(refuge.id),json,{headers:{'Content-Type':'application/json'}})
                .toPromise()
                .then(response => this.castRefuge(refuge.id,response));
    }
}

export class Refuge {
    id:string;
    title:string;
    network_id:number;
    boundary_id:string;
    selections:VisSelection[];
    resources?:string;
}
