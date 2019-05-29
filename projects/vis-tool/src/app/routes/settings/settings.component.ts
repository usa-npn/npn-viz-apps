import { APPLICATION_SETTINGS, SpeciesTitleFormat } from '@npn/common';
import { Component } from '@angular/core';

@Component({
    template: `
    <div id="applicationSettings">
        <h1>Application Settings</h1>
        <section>
            <h3>Species title</h3>
            <mat-radio-group [(ngModel)]="settings.speciesTitleFormat">
                <mat-radio-button [value]="titleEnum.CommonName">Common name</mat-radio-button>
                <mat-radio-button [value]="titleEnum.ScientificName">Scientific name</mat-radio-button>
            </mat-radio-group>
        </section>
        <!--pre>{{settings.settings | json}}</pre-->
    </div>
    `,
    styles:[`
    :host {
        display: block;
        padding: 15px;
    }
    mat-radio-group {
        display: flex;
    }
    mat-radio-group > mat-radio-button {
        padding-right: 5px;
    }
    section {
        padding: 15px 0px;
    }
    section > p {
        margin: 10px 0px 0px 0px;
    }
    `]
})
export class SettingsComponent {
    titleEnum = SpeciesTitleFormat;
    settings = APPLICATION_SETTINGS;
}