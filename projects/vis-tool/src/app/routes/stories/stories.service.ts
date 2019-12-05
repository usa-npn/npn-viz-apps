import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { Router } from '@angular/router';
import { SharingService, Shared } from '../explore_pheno/sharing.service';
import { RoutePath } from '../../route-path';
import { NpnServiceUtils } from '@npn/common';
import { GeocoderResponse } from './google-geocoder';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';

/**
 * Defines a story to place on the interface.
 */
export interface Story extends Shared {
    /** The story title */
    title: string;
    /** The tagline to display below the title */
    tagline: string;
    /** A long description (HTML) to place in a dialog when opening the story */
    description?: string;
    /** An image (HTML) to place in a dialog when opening the story */
    image?;
}

export interface StoriesConfiguration {
    /** URL to an image to use for the background (should be available using same scheme as application) */
    backgroundImage?: string;
    /** The list of `Stories` to place in the UI. */
    stories:Story [];
}

@Injectable()
export class StoriesService {

    constructor(
        private serviceUtils:NpnServiceUtils,
        private router:Router,
        private sharingService:SharingService
    ) {}

    mapDynamicDates(storiesConfig: StoriesConfiguration) {
      let today = new Date();
      today.setHours(0,0,0,0);

      //calculate today's doy
      let start = new Date(today.getFullYear(), 0, 0);
      let diff = (+today - +start) + ((start.getTimezoneOffset() - today.getTimezoneOffset()) * 60 * 1000);
      let oneDay = 1000 * 60 * 60 * 24;
      let doy = Math.floor(diff / oneDay);

      storiesConfig.stories.forEach(s => {
        if(s.external['extentValue'] == 'today') {
          s.external['extentValue'] = today.toISOString();
        }
        if(s.external['doy'] == 'today') {
          s.external['doy'] = doy;
        }
        if(s.external['year'] == 'today') {
          s.external['year'] = today.getFullYear();
        }
      })
      return storiesConfig;
    }

    getConfiguration():Observable<StoriesConfiguration> {
        return from(
            this.serviceUtils.cachedGet('assets/prod-stories.json')
              .catch((err) => {
                  if(environment.production) {
                    console.error(`Error loading stories ${err.status} "${err.statusText}"`);
                  }
                  return this.serviceUtils.get('assets/dev-stories.json');
                  /* causes more confusion than worth in a dev environment
                    .then(stories => {
                      // avoid future 404's
                      this.serviceUtils.cachedSet('stories.json',stories)
                      return stories;
                    });
                  */
              })
        ).pipe( map((storiesConfig: StoriesConfiguration) => this.mapDynamicDates(storiesConfig)) );
    }

    visit(story:Story):Promise<boolean> {
        return this.router.navigate([
            RoutePath.EXPLORE_PHENO,
            {s: this.sharingService.serialize(story)}
        ]);
    }

    geoCodeZip(zip:string):Observable<number []> {
        return this.serviceUtils.http.get<GeocoderResponse>(`https://maps.googleapis.com/maps/api/geocode/json?address=${zip}&key=${environment.googleMapsApiKey}`)
          .pipe(
            map(response => {
              if(response.status !== 'OK') {
                throw new Error(`${response.status} : ${response.error_message}`);
              }
              if(!response.results.length) {
                throw new Error(`Geocoding for zip ${zip} returned no results`);
              }
              const {location} = response.results[0].geometry;
              return [location.lat,location.lng];
            })
          );
    }
}