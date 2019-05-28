import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
    MatButtonModule,
    MatSidenavModule,
    MatListModule,
    MatTooltipModule,
    MatCheckbox,
    MatSelectModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatInputModule,
    MatSliderModule,
    MatRadioModule,
    MatBottomSheetModule,
    MatGridListModule,
    MatCardModule,
    MatExpansionModule
 } from "@angular/material";

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CommonModule } from '@angular/common';
import { SelectTreeModule } from '../select-tree';

/**
 * Consolidates inclusion of all used [Google material](https://material.angular.io/) components.
 */
@NgModule({
    imports:[
        // most of the time if you're working with MaterialModule
        // then you're alsow orking with forms.
        CommonModule, FormsModule, ReactiveFormsModule,
        FontAwesomeModule,

        SelectTreeModule,

        MatButtonModule,
        MatSidenavModule,
        MatListModule,
        MatTooltipModule,
        MatCheckboxModule,
        MatSelectModule,
        MatSnackBarModule,
        MatInputModule,
        MatSliderModule,
        MatRadioModule,
        MatBottomSheetModule,
        MatGridListModule,
        MatCardModule,
        MatExpansionModule
    ],
    exports: [
        CommonModule, FormsModule, ReactiveFormsModule,
        FontAwesomeModule,

        SelectTreeModule,

        MatButtonModule,
        MatSidenavModule,
        MatListModule,
        MatTooltipModule,
        MatCheckbox,
        MatSelectModule,
        MatSnackBarModule,
        MatInputModule,
        MatSliderModule,
        MatRadioModule,
        MatBottomSheetModule,
        MatGridListModule,
        MatCardModule,
        MatExpansionModule
    ]
})
export class MaterialModule {
}