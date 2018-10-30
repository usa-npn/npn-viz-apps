import {Component,Input} from '@angular/core';
import {Refuge} from './refuge.service';

@Component({
    selector: 'refuge-resources',
    template: `
    <div [innerHtml]="refuge && refuge.resources ? refuge.resources : ''"></div>
    <a mat-raised-button *ngIf="!userIsLoggedIn" [href]="'//www.usanpn.org/user/register?default_group_id='+refuge.network_id">Register</a>
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
    refuge:Refuge;
    @Input()
    userIsLoggedIn:boolean = false;
}
