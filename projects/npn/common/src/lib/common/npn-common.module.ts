import { NgModule, InjectionToken } from '@angular/core';
import { BrowserModule }    from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { CacheService } from './cache-service';
import { SpeciesService } from './species.service';
import { NetworkService } from './network.service';

import { SpeciesTitlePipe } from './species-title.pipe';
import { DoyPipe } from './doy.pipe';
import { LegendDoyPipe } from './legend-doy.pipe';

import { DatePipe } from '@angular/common';

import { NPN_CONFIGURATION } from './config';
import { NpnServiceUtils } from './npn-service-utils.service';

export const NPN_BASE_HREF = new InjectionToken<string>('npnBaseHref');

@NgModule({
    imports:[
        BrowserModule,
        HttpClientModule
    ],
    declarations: [
        SpeciesTitlePipe,
        LegendDoyPipe,
        DoyPipe
    ],
    exports: [
        SpeciesTitlePipe,
        LegendDoyPipe,
        DoyPipe
    ],
    providers: [
        CacheService,
        SpeciesService,
        NetworkService,
        NpnServiceUtils,
        SpeciesTitlePipe,
        DatePipe,
        DoyPipe,
        LegendDoyPipe,
        { provide: NPN_BASE_HREF, useValue: '/' },
        {
            provide: NPN_CONFIGURATION, useValue: {
                apiRoot: '//www-dev.usanpn.org',
                dataApiRoot: '//data-dev.usanpn.org:3006',
                geoServerRoot: '//geoserver-dev.usanpn.org/geoserver'
            }
        }
    ]
})
export class NpnCommonModule { }