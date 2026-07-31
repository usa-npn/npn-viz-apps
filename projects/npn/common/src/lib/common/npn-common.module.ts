import { NgModule, InjectionToken, APP_INITIALIZER } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { CacheService } from './cache.service';
import { SpeciesService } from './species.service';
import { SpeciesFilterService } from './species-filter.service';
import { NetworkService } from './network.service';
import { StationService } from './station.service';

import { SpeciesTitlePipe, TaxonomicSpeciesTitlePipe } from './species-title.pipe';
import { DoyPipe } from './doy.pipe';
import { LegendDoyPipe } from './legend-doy.pipe';

import { DatePipe } from '@angular/common';

import { NPN_CONFIGURATION } from './config';
import { NpnServiceUtils } from './npn-service-utils.service';
import { NpnLogoComponent } from './npn-logo.component';
import { PointService } from '../gridded/point.service';
import { TinybirdTokenService } from './tinybird-token.service';
import { TinybirdAuthInterceptor } from './tinybird-auth.interceptor';

export const NPN_BASE_HREF = new InjectionToken<string>('npnBaseHref');

/**
 * Warms the Tinybird token at application startup so the first request needing one
 * does not also pay to acquire it.
 *
 * Starts the fetch but does not wait on it: an APP_INITIALIZER that blocks would
 * delay bootstrap behind a network call, and one that rejects would leave a white
 * screen.  Tinybird is one data source among several and the rest of the application
 * must start without it.  A request arriving while this is still in flight joins the
 * same in-flight promise rather than issuing a second one.
 *
 * Must be an exported named function; tsconfig.lib.json sets strictMetadataEmit,
 * which rejects arrow functions used as provider factories.
 */
export function tinybirdTokenPrefetch(tokenService: TinybirdTokenService): () => void {
    return () => tokenService.prefetch();
}

@NgModule({
    imports:[
        HttpClientModule
    ],
    declarations: [
        SpeciesTitlePipe,
        TaxonomicSpeciesTitlePipe,
        LegendDoyPipe,
        DoyPipe,
        NpnLogoComponent
    ],
    exports: [
        SpeciesTitlePipe,
        TaxonomicSpeciesTitlePipe,
        LegendDoyPipe,
        DoyPipe,
        NpnLogoComponent
    ],
    providers: [
        CacheService,
        SpeciesService,
        SpeciesFilterService,
        NetworkService,
        PointService,
        StationService,
        NpnServiceUtils,
        TinybirdTokenService,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: TinybirdAuthInterceptor,
            multi: true
        },
        {
            provide: APP_INITIALIZER,
            useFactory: tinybirdTokenPrefetch,
            deps: [TinybirdTokenService],
            multi: true
        },
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