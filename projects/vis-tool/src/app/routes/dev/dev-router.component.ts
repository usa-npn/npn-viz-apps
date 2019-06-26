import { Component } from '@angular/core';
import { faTree, faDove } from '@fortawesome/pro-light-svg-icons';

@Component({ template: `
    <mat-sidenav-container>
    <mat-sidenav mode="side" opened>
        <mat-list>
            <mat-list-item routerLinkActive="active" routerLink="selectTree">
                <fa-icon mat-list-icon [icon]="faTree"></fa-icon>
                <h4 mat-line>Select tree</h4>
            </mat-list-item>
            <mat-list-item routerLinkActive="active" routerLink="speciesPheno">
                <fa-icon mat-list-icon [icon]="faDove"></fa-icon>
                <h4 mat-line>Species/Pheno</h4>
            </mat-list-item>
        </mat-list>
    </mat-sidenav>
    <mat-sidenav-content><router-outlet></router-outlet></mat-sidenav-content>
    </mat-sidenav-container>
    `,
    styles: [`
    mat-sidenav-container {
        height: 100%;
    }
    mat-sidenav-content {
        padding: 15px;
    }
    mat-sidenav {
        border-right: 1px solid #eee;
    }
    mat-sidenav mat-list-item:hover {
        background-color: #ddd;
        cursor: pointer;
    }
    mat-sidenav mat-list-item.active {
        background-color: #eee;
    }
    `]
})
export class DevRouterComponent {
    faTree = faTree;
    faDove = faDove;
}