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
        <!--section>
            <h3>Exclude less precise data from visualizations</h3>
            <mat-radio-group [(ngModel)]="settings.filterLqdSummary">
                <mat-radio-button [value]="true">Yes</mat-radio-button>
                <mat-radio-button [value]="false">No</mat-radio-button>
            </mat-radio-group>
            <p class="mat-caption">Selecting <strong>Yes</strong> will exclude data points which lack a "no" record preceding the first "yes" record from certain visualizations.</p>
        </section>
        <section>
            <h3>Data precision filter</h3>
            <mat-form-field>
                <mat-select [(value)]="settings.numDaysQualityFilter">
                <mat-option [value]="7">7 days</mat-option>
                <mat-option [value]="14">14 days</mat-option>
                <mat-option [value]="30">30 days</mat-option>
                </mat-select>
            </mat-form-field>
            <p class="mat-caption">Less precise data is removed from the scatter plot and map visualizations by only plotting data points preceded or followed by a “no” within 30 days. This filter can be adjusted here to 7, 14, or 30 days.</p>
        </section-->
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