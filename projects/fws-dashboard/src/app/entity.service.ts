import {Injectable} from '@angular/core';

import {HttpClient} from '@angular/common/http';

import {CacheService,VisualizationSelectionFactory,VisSelection} from '@npn/common';

// this means that the app can no longer function outside of the context of Drupal, period.
const API_ROOT = '/api';

export enum DashboardMode {
    REFUGE = 'refuge',
    PHENO_TRAIL = 'phenology_trail'
};
export let DASHBOARD_MODE:DashboardMode = DashboardMode.REFUGE;
export function setDashboardMode(mode:DashboardMode) {
    DASHBOARD_MODE = mode;
}

@Injectable()
export class EntityService {
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

    private apiUrl(entity_id) {
        return `${API_ROOT}/${DASHBOARD_MODE}/${entity_id}`;
    }

    private castEntity(entityId,apiResult:any):EntityBase {
        // actually constructing an instance so that other classes can use instanceof
        let entity;
        switch(DASHBOARD_MODE) {
            case DashboardMode.REFUGE:
                entity = new Refuge();
                break;
            case DashboardMode.PHENO_TRAIL:
                entity = new PhenologyTrail();
                break;
            default:
                throw new Error(`Unsupported DASHBOARD_MODE "${DASHBOARD_MODE}"`);
        }
        Object.assign(entity,apiResult);
        entity.id = entityId;
        let selections = (entity.selections||[]).map(s => JSON.parse(s));
        entity.selections = this.selectionFactory.newSelections(selections);
        return entity;
    }

    get(entity_id):Promise<EntityBase> {
console.log(`DASHBOARD_MODE=${DASHBOARD_MODE}`);
        return this.http.get(this.apiUrl(entity_id))
                .toPromise()
                .then(response => this.castEntity(entity_id,response));
    }

    save(entity:EntityBase):Promise<EntityBase> {
        let r = {...{},...entity} as any;
        r.selections = (r.selections||[]).map(s => JSON.stringify(s.external) );
        let json = JSON.stringify(r);
        console.log(`JSON ${json}`);
        return this.http.put(this.apiUrl(entity.id),json,{headers:{'Content-Type':'application/json'}})
                .toPromise()
                .then(response => this.castEntity(entity.id,response));
    }
}


// using class instead of interface so can use instanceof
export class EntityBase {
    id:string;
    title:string;
    selections:VisSelection[];
    resources?:string;
}
export class Refuge extends EntityBase {
    network_id:number;
    boundary_id:string;
}
export class PhenologyTrail extends EntityBase {
    network_ids:number[];
}
