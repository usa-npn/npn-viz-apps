import { Component, ViewChild } from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';

import {Observable,Subject} from 'rxjs';
import {filter,takeUntil} from 'rxjs/operators';

import { MapBase } from './map-base';
import { Refuge } from './refuge.service';
import { RefugeControl } from './refuge-control.component';

import {ClippedWmsMapSelectionFactory,ClippedWmsMapSelection} from '@npn/common';

const ONE_DAY_MILLIS:number = (24*60*60*1000);
interface DdSelection {
    label: string;
    selection: ClippedWmsMapSelection;
}

@Component({
    selector: 'status-of-spring',
    template: `
    <form class="control-form">
        <refuge-control (onList)="refuges=$event" (onSelect)="focusRefuge($event)"></refuge-control>
        <mat-form-field *ngIf="selections" class="selection-input">
            <mat-select placeholder="Layer" [formControl]="selectionFormControl">
                <mat-option *ngFor="let s of selections" [value]="s.selection">{{ s.label }}</mat-option>
            </mat-select>
        </mat-form-field>
        <button *ngIf="selection" class="reset-button" [disabled]="selection && selection.working"
            mat-icon-button (click)="reset()" matTooltip="Reset map"><i class="fa fa-refresh" aria-hidden="true"></i></button>
    </form>

    <div class="map-wrapper">
        <div class="vis-working" *ngIf="selection && selection.working">
            <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        </div>
        <agm-map (mapReady)="mapReady($event)"
                [latitude]="latitude" [longitude]="longitude" [zoom]="zoom"
                [streetViewControl]="false" [scrollwheel]="false" [styles]="mapStyles">
            <span *ngFor="let refuge of refuges">
                <agm-marker *ngIf="refuge !== focused"
                    (markerClick)="refugeClick(refuge)"
                    iconUrl="/sites/fws/libraries/gmap_markers/marker-1.png"
                    [title]="refuge.title"
                    [latitude]="refuge.location.lat" [longitude]="refuge.location.lng"></agm-marker>
            </span>
        </agm-map>
        <wms-map-legend *ngIf="selection && selection.legend && selection.data && selection.data.statistics && selection.data.statistics.count !== 0"
            [legend]="selection.legend"
            [legendTitle]="selection.legendTitle"></wms-map-legend>
        <clipped-wms-map-statistics *ngIf="selection && selection.data && selection.data.statistics"
            [selection]="selection"></clipped-wms-map-statistics>
    </div>
    <div class="project-profile-block" *ngIf="focused">
        <p *ngIf="focused.partner">
            How is the Status of Spring impacting phenology of plants and animals at your Refuge?
            Visit the <a [href]="focused.links.dashboard" [title]="focused.title + 'Dashboard'">{{focused.title}} Dashboard</a> to find out!</p>
        <span *ngIf="!focused.partner">
            <p>Refuges across the country are using <a href="https://www.usanpn.org/natures_notebook" alt="Nature's Notebook" title="Nature's Notebook"><em>Nature’s Notebook</em></a> to learn about how the Status of Spring is impacting phenology of plants and animals at their refuges.</p>
            <p>Start a phenology monitoring project at your refuge to better understand phenological changes of your species of interest!</p>
            <p class="call-arrow"><a href="/project" title="Start a project" class="call-arrow-link">Start a project</a></p>
        </span>
    </div>
    `,
    styleUrls:['./status-of-spring.component.scss']
})
export class StatusOfSpringComponent extends MapBase {
    @ViewChild(RefugeControl) refugeControl:RefugeControl;
    private componentDestroyed:Subject<any> = new Subject();

    allControls:FormGroup;
    selectionFormControl:FormControl = new FormControl();

    refuges:Refuge[];
    focused:Refuge;
    selection:ClippedWmsMapSelection;

    selections:DdSelection[];

    constructor(public selectionFactory:ClippedWmsMapSelectionFactory) {
        super();
    }

    ngOnInit() {
        this.allControls = new FormGroup({
            refuges: this.refugeControl.control,
            selection: this.selectionFormControl
        });
        this.selectionFormControl.valueChanges.pipe(
                filter(s => typeof(s) === 'object'),
                filter(s => !(this.selection && s === this.selection)), // don't re-deliver
                takeUntil(this.componentDestroyed)
            ).subscribe((selection:ClippedWmsMapSelection) => this.setSelection(selection));
    }

    ngOnDestroy() {
        this.componentDestroyed.next();
    }

    private newSelection(refuge:Refuge,service:string,layerId:string):ClippedWmsMapSelection {
        let selection = this.selectionFactory.newSelection();
        selection.networkIds = [refuge.network_id];
        selection.fwsBoundary = refuge.boundary_id;
        selection.service = service;
        selection.layer = selection.validLayers.reduce((found,l) => {
                return found||(l.id === layerId ? l : undefined);
            },undefined);
        return selection;
    }

    refugeTitle(refuge:Refuge) {
        return refuge ? refuge.title : '';
    }

    refugeClick(refuge:Refuge) {
        this.refugeControl.control.setValue(refuge);
    }

    reset() {
        this.refugeControl.control.setValue(null);
    }

    focusRefuge(refuge:Refuge) {
        console.debug('focusRefuge',refuge);
        this.focused = refuge;
        if(!refuge) {
            this.selections = null;
            this.selectionFormControl.setValue(null);
            this.getMap.then((map:google.maps.Map) => {
                map.setCenter(new google.maps.LatLng(this.latitude,this.longitude));
                map.setZoom(this.zoom);
            });
            return;
        }
        this.getMap.then((map:google.maps.Map) => {
            map.panTo(new google.maps.LatLng(refuge.location.lat,refuge.location.lng));
            map.setZoom(8);
        });
        console.log('focusRefuge',refuge)
        // build the new set of selections to put stuff on the map
        let selections:DdSelection[] = [],
            // TODO writing in winter and no spring data, pretending
            // today is another date for now.
            //today = new Date(2017,4,2,0,0,0,0),//new Date(),
            today = new Date(),
            yesterday = new Date(today.getTime()-ONE_DAY_MILLIS),
            selection;
        // where has spring arrived
        selection = this.newSelection(refuge,'si-x','current');
        selection.legendTitle = `${refuge.title}, Spring First Leaf Index`;
        selection.explicitDate = yesterday;
        selections.push({
            label: 'Where has spring arrived?',
            selection: selection
        });
        // spring forecast
        selection = this.newSelection(refuge,'si-x','forecast');
        selection.forecastDays = 3;
        selection.explicitDate = today;
        selection.legendTitle = `${refuge.title}, Spring First Leaf Index ${selection.forecastDays}-day Forecast`;
        selections.push({
            label: 'Spring forecast',
            selection: selection
        });
        // anomaly
        selection = this.newSelection(refuge,'si-x','anomaly');
        selection.legendTitle = `${refuge.title}, Spring First Leaf Index Anomaly`;
        selection.explicitDate = yesterday;
        selections.push({
            label: 'How does this year stack up?',
            selection: selection
        });

        this.selections = selections;
        this.selectionFormControl.setValue(this.selections[0].selection);
    }

    setSelection(s:ClippedWmsMapSelection) {
        console.debug('setSelection',s ? s.external : 'NULL');
        this.getMap
            .then((map:google.maps.Map) => {
                let add = () => {
                    if(this.selection = s) {
                        let refuge = this.focused,
                            onResolve = () => {
                                this.allControls.enable();
                                console.debug('added selection',s.external)
                            };
                        this.allControls.disable();
                        if(refuge.no_geospatial) {
                            console.debug('refuge has no geo spatial data.');
                            s.layer = {...s.layer}
                            s.layer.noDataDisclaimer = 'Data are not currently available for this Refuge, as it is outside of the coverage of the Spring Indices model.';
                            s.getBoundary()
                                .then((geoJson) => {
                                    s.data = {
                                        data: null,
                                        boundary: geoJson,
                                        statistics: {
                                            date: s.explicitDate,
                                            count: 0
                                        },
                                    };
                                    s.addBoundary(map,geoJson);
                                    onResolve();
                                });
                        } else {
                            s.addTo(map).then(onResolve);
                        }

                    }
                };
                if(this.selection) {
                    this.selection.removeFrom(map)
                        .then(add);
                } else {
                    add();
                }
            });
    }
}
