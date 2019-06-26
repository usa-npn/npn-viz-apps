import { NgModule, InjectionToken } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { CacheService } from './cache.service';
import { SpeciesService } from './species.service';
import { NetworkService } from './network.service';
import { StationService } from './station.service';

import { SpeciesTitlePipe, TaxonomicSpeciesTitlePipe } from './species-title.pipe';
import { DoyPipe } from './doy.pipe';
import { LegendDoyPipe } from './legend-doy.pipe';

import { DatePipe } from '@angular/common';

import { NPN_CONFIGURATION } from './config';
import { NpnServiceUtils } from './npn-service-utils.service';
import { NpnLogoComponent } from './npn-logo.component';

export const NPN_BASE_HREF = new InjectionToken<string>('npnBaseHref');

@NgModule({
    imports:[
        HttpClientModule
    ],
    declarations: [
        SpeciesTitlePipe,
        LegendDoyPipe,
        DoyPipe,
        NpnLogoComponent
    ],
    exports: [
        SpeciesTitlePipe,
        LegendDoyPipe,
        DoyPipe,
        NpnLogoComponent
    ],
    providers: [
        CacheService,
        SpeciesService,
        NetworkService,
        StationService,
        NpnServiceUtils,
        SpeciesTitlePipe,
        TaxonomicSpeciesTitlePipe,
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