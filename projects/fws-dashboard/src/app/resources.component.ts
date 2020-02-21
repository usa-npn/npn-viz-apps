import {Component,Input} from '@angular/core';
import {EntityBase} from './entity.service';

@Component({
    selector: 'fws-dashboard-resources',
    template: `
    <div [innerHtml]="entity && entity.resources ? entity.resources : ''"></div>
    <a mat-raised-button *ngIf="!userIsLoggedIn" [href]="'//www.usanpn.org/user/register?default_group_id='+entity.network_id">Register</a>
    <a mat-raised-button *ngIf="!userIsLoggedIn" href="/user/login">Login</a>
    <a mat-raised-button *ngIf="userIsLoggedIn" href="//mynpn.usanpn.org/npnapps/" target="_blank">My Observation Deck</a>
    `,
    styles:[`
        a[mat-raised-button] {
            margin-right: 5px;
        }
    `]
})
export class ResourcesComponent {
    @Input()
    entity:EntityBase;
    @Input()
    userIsLoggedIn:boolean = false;
}
