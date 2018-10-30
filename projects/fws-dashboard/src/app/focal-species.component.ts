import {Component,Input,OnChanges,SimpleChanges} from '@angular/core';

import {Species,SpeciesService} from '@npn/common';
import {Refuge} from './refuge.service';

@Component({
    selector: 'focal-species',
    template:`
    <div *ngIf="refuge">
        <h3>Focal Species for {{refuge.title}}</h3>
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
    refuge:Refuge;

    speciesList:Species[];

    constructor(private speciesService:SpeciesService) {

    }

    ngOnChanges(changes:SimpleChanges) {
        if(changes.refuge && changes.refuge.currentValue) {
            this.speciesService.getAllSpecies({'network_id[0]':changes.refuge.currentValue.network_id})
                .then(list => this.speciesList = list)
                .catch(e => console.error(e));
        }
    }
}
