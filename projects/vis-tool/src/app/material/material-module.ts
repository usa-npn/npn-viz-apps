import { NgModule } from "@angular/core";
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
    MatButtonModule,
    MatSidenavModule,
    MatListModule,
    MatTooltipModule,
    MatCheckbox,
    MatSelectModule,
    MatCheckboxModule,
    MatSnackBarModule
 } from "@angular/material";

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

/**
 * Consolidates inclusion of all used [Google material](https://material.angular.io/) components.
 */
@NgModule({
    imports:[
        // most of the time if you're working with MaterialModule
        // then you're alsow orking with forms.
        BrowserModule, FormsModule, ReactiveFormsModule,
        FontAwesomeModule,

        MatButtonModule,
        MatSidenavModule,
        MatListModule,
        MatTooltipModule,
        MatCheckboxModule,
        MatSelectModule,
        MatSnackBarModule
    ],
    exports: [
        BrowserModule, FormsModule, ReactiveFormsModule,
        FontAwesomeModule,

        MatButtonModule,
        MatSidenavModule,
        MatListModule,
        MatTooltipModule,
        MatCheckbox,
        MatSelectModule,
        MatSnackBarModule
    ]
})
export class MaterialModule {
}