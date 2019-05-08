import { Component, Input } from '@angular/core';
import { StoriesService } from './stories.service';
import { FormControl, AbstractControl } from '@angular/forms';
import { MonitorsDestroy } from '@npn/common';
import { takeUntil, filter } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material';

@Component({
    selector: 'geocode-zip',
    template: `
    <mat-form-field>
        <input matInput [formControl]="zip" placeholder="Please provide your zip code" />
    </mat-form-field>
    `
})
export class GeocodeZipComponent extends MonitorsDestroy {
    @Input() external:any;

    zip:FormControl = new FormControl(null,(control:AbstractControl) => {
        const zip = control.value;
        return !!zip && /^\d{5}$/.test(zip)
            ? null
            : {zip:`Invalid zip code ${zip}`};
    });

    constructor(
        private storyService:StoriesService,
        private snackBar:MatSnackBar
    ) {
        super();
    }

    ngOnInit() {
        this.zip.valueChanges
            .pipe(
                filter(v => this.zip.valid),
                takeUntil(this.componentDestroyed)
            )
            .subscribe(zip => {
                this.storyService.geoCodeZip(zip)
                    .subscribe(
                        latLng => this.external.latLng = latLng,
                        err => {
                            console.error(err);
                            this.snackBar.open(`Unable to geocode zipcode ${zip}`)
                        }
                    );
            });
    }
}