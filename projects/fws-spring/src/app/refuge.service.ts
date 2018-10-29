import {Injectable} from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

import {HttpClient, HttpHeaders} from '@angular/common/http';

import {CacheService,VisualizationSelectionFactory,VisSelection} from  '@npn/common';

const HEADERS = new HttpHeaders({'Content-Type':'application/json'});

// this means that the app can no longer function outside of the context of Drupal, period.
const API_ROOT = '/api/refuge';

@Injectable()
export class RefugeService {
    private refugePromiseResolver;
    private refugePromiseRejector;
    private refugeListPromise:Promise<Refuge[]> = new Promise((resolve,reject) => {
        this.refugePromiseResolver = resolve;
        this.refugePromiseRejector = reject;
    });

    constructor(private http: HttpClient,
                protected cacheService: CacheService,
                protected selectionFactory: VisualizationSelectionFactory) {
        this.http.get(`${API_ROOT}`,{
                params: {
                    terse: 'true'
                }
            }).pipe(
                map(map => Object.keys(map).map(key => map[key]) as Refuge[])
            )
            .subscribe(
                refuges => this.refugePromiseResolver(refuges),
                err => this.refugePromiseRejector(err));
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

    refugeList():Observable<Refuge []> {
        return from(this.refugeListPromise);
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
            console.log(`JSON ${json}`)
            return this.http.put(this.refugeUrl(refuge.id),json,{headers:HEADERS})
                .toPromise()
                .then(response => this.castRefuge(refuge.id,response));
    }
}

export class Location {
    lat: number;
    lng: number;
}

export class Refuge {
    id:string;
    title:string;
    network_id:number;
    partner:boolean;
    no_geospatial: boolean;
    boundary_id:string;
    location?:Location;
    selections:VisSelection[];
    resources?:string;
    flywayId?:string;
    point?:any;
    data?:any;
    icon?:any;
}
