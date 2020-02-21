import {Component,Input,OnChanges,SimpleChanges} from '@angular/core';

import {Species,SpeciesService} from '@npn/common';
import {EntityBase,Refuge,PhenologyTrail} from './entity.service';

@Component({
    selector: 'focal-species',
    template:`
    <div *ngIf="entity">
        <h3>Focal Species for {{entity.title}}</h3>
        <ul *ngIf="speciesList && speciesList.length">
            <li *ngFor="let s of speciesList">
            <a target="_blank" [href]="'https://usanpn.org/nn/'+s.genus+'_'+s.species">{{s | speciesTitle:'common-name'}} ({{s | speciesTitle:'scientific-name'}})</a>
            </li>
        </ul>
    </div>
    `,
    styles:[`
        h3 {
            font-size: 28px;
        }
    `]
})
export class FocalSpeciesComponent implements OnChanges {
    @Input()
    entity:EntityBase;

    speciesList:Species[];

    constructor(private speciesService:SpeciesService) {

    }

    ngOnChanges(changes:SimpleChanges) {
        if(changes.entity && changes.entity.currentValue) {
            let params = {};
            const entity = changes.entity.currentValue as EntityBase;
            const networkIds = entity instanceof Refuge
                ? [entity.network_id]
                : entity instanceof PhenologyTrail
                    ? entity.network_ids
                    : [];
            if(networkIds.length) { // else should never happen but...
                networkIds.forEach((id,i) => params[`network_id[${i}]`] = id);
            }
            this.speciesService.getAllSpecies(params)
                .then(list => this.speciesList = list)
                .catch(e => console.error(e));
        }
    }
}
