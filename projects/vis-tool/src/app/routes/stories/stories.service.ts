import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { SharingService, Shared } from '../explore_pheno/sharing.service';
import { RoutePath } from '../../route-path';
import { SpeciesTitleFormat } from '@npn/common';
import { HttpClient } from '@angular/common/http';
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
        private http:HttpClient,
        private router:Router,
        private sharingService:SharingService
    ) {}

    getConfiguration():Observable<StoriesConfiguration> {
        // parse/stringify so that we're not modifying the underling objects.
        return of(JSON.parse(JSON.stringify(CONFIGURATION)));
    }

    visit(story:Story):Promise<boolean> {
        return this.router.navigate([
            RoutePath.EXPLORE_PHENO,
            {s: this.sharingService.serialize(story)}
        ]);
    }

    geoCodeZip(zip:string):Observable<number []> {
        return this.http.get<GeocoderResponse>(`https://maps.googleapis.com/maps/api/geocode/json?address=${zip}&key=${environment.googleMapsApiKey}`)
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

const MAPLES_BLB_2017_2018 = {
    "$class": "ScatterPlotSelection",
    "guid": "67259fcc-e6d8-450d-a5c8-c8a15a9db16c",
    "meta": {},
    "networkIds": [],
    "stationIds": [],
    "individualPhenometrics": false,
    "start": 2017,
    "end": 2018,
    "regressionLines": true,
    "axis": {
      "key": "latitude",
      "label": "Latitude"
    },
    "plots": [
      {
        "color": "#1f77b4",
        "species": {
          "common_name": "red maple",
          "genus": "Acer",
          "species": "rubrum",
          "kingdom": "Plantae",
          "species_id": 3,
          "number_observations": 675361
        },
        "phenophase": {
          "phenophase_id": 371,
          "phenophase_name": "Breaking leaf buds",
          "phenophase_category": "Leaves",
          "phenophase_definition": "One or more breaking leaf buds are visible on the plant.  A leaf bud is considered 'breaking' once a green leaf tip is visible at the end of the bud, but before the first leaf from the bud has unfolded to expose the leaf stalk (petiole) or leaf base.",
          "phenophase_additional_definition": "",
          "seq_num": 10,
          "color": "Green1",
          "abundance_category": -1,
          "raw_abundance": false
        }
      },
      {
        "color": "#ff7f0e",
        "species": {
          "common_name": "sugar maple",
          "genus": "Acer",
          "species": "saccharum",
          "kingdom": "Plantae",
          "species_id": 61,
          "number_observations": 258618
        },
        "phenophase": {
          "phenophase_id": 371,
          "phenophase_name": "Breaking leaf buds",
          "phenophase_category": "Leaves",
          "phenophase_definition": "One or more breaking leaf buds are visible on the plant.  A leaf bud is considered 'breaking' once a green leaf tip is visible at the end of the bud, but before the first leaf from the bud has unfolded to expose the leaf stalk (petiole) or leaf base.",
          "phenophase_additional_definition": "",
          "seq_num": 10,
          "color": "Green1",
          "abundance_category": -1,
          "raw_abundance": false
        }
      }
    ],
    "filterDisclaimer": "For quality assurance purposes, only onset dates that are preceded by negative records are included in the visualization."
  };
const MAPLES_COLORS_2017_2018 = {
    "$class": "CalendarSelection",
    "guid": "5d7ac0b5-e292-44b8-8611-29aabad5f1c0",
    "meta": {},
    "networkIds": [],
    "stationIds": [],
    "negative": true,
    "negativeColor": "#aaa",
    "years": [
      2017,
      2018
    ],
    "plots": [
      {
        "color": "#d62728",
        "species": {
          "common_name": "red maple",
          "genus": "Acer",
          "species": "rubrum",
          "kingdom": "Plantae",
          "species_id": 3,
          "number_observations": 675361
        },
        "phenophase": {
          "phenophase_id": 371,
          "phenophase_name": "Breaking leaf buds",
          "phenophase_category": "Leaves",
          "phenophase_definition": "One or more breaking leaf buds are visible on the plant.  A leaf bud is considered 'breaking' once a green leaf tip is visible at the end of the bud, but before the first leaf from the bud has unfolded to expose the leaf stalk (petiole) or leaf base.",
          "phenophase_additional_definition": "",
          "seq_num": 10,
          "color": "Green1",
          "abundance_category": -1,
          "raw_abundance": false
        }
      },
      {
        "color": "#1f77b4",
        "species": {
          "common_name": "sugar maple",
          "genus": "Acer",
          "species": "saccharum",
          "kingdom": "Plantae",
          "species_id": 61,
          "number_observations": 258618
        },
        "phenophase": {
          "phenophase_id": 371,
          "phenophase_name": "Breaking leaf buds",
          "phenophase_category": "Leaves",
          "phenophase_definition": "One or more breaking leaf buds are visible on the plant.  A leaf bud is considered 'breaking' once a green leaf tip is visible at the end of the bud, but before the first leaf from the bud has unfolded to expose the leaf stalk (petiole) or leaf base.",
          "phenophase_additional_definition": "",
          "seq_num": 10,
          "color": "Green1",
          "abundance_category": -1,
          "raw_abundance": false
        }
      }
    ],
    "labelOffset": 15,
    "bandPadding": 0.55,
    "fontSizeDelta": 2
};
const MAPLES_ACTIVITY_2017 = {
    "$class": "ActivityCurvesSelection",
    "guid": "ac288c2d-b702-4981-ba5d-c2aa33dbcba7",
    "meta": {},
    "networkIds": [],
    "stationIds": [],
    "interpolate": 2,
    "frequency": {
      "value": 7,
      "label": "Weekly"
    },
    "curves": [
      {
        "id": 0,
        "color": "#1f77b4",
        "species": {
          "common_name": "red maple",
          "genus": "Acer",
          "species": "rubrum",
          "kingdom": "Plantae",
          "species_id": 3,
          "number_observations": 664416
        },
        "phenophase": {
          "phenophase_id": 371,
          "phenophase_name": "Breaking leaf buds",
          "phenophase_category": "Leaves",
          "phenophase_definition": "One or more breaking leaf buds are visible on the plant.  A leaf bud is considered 'breaking' once a green leaf tip is visible at the end of the bud, but before the first leaf from the bud has unfolded to expose the leaf stalk (petiole) or leaf base.",
          "phenophase_additional_definition": "",
          "seq_num": 10,
          "color": "Green1",
          "abundance_category": -1,
          "raw_abundance": false
        },
        "metric": {
          "id": "num_yes_records",
          "sampleSize": "status_records_sample_size",
          "label": "Total Yes Records"
        },
        "year": 2017
      },
      {
        "id": 1,
        "color": "#ff7f0e",
        "year": 2017,
        "species": {
          "common_name": "sugar maple",
          "genus": "Acer",
          "species": "saccharum",
          "kingdom": "Plantae",
          "species_id": 61,
          "number_observations": 256064
        },
        "phenophase": {
          "phenophase_id": 371,
          "phenophase_name": "Breaking leaf buds",
          "phenophase_category": "Leaves",
          "phenophase_definition": "One or more breaking leaf buds are visible on the plant.  A leaf bud is considered 'breaking' once a green leaf tip is visible at the end of the bud, but before the first leaf from the bud has unfolded to expose the leaf stalk (petiole) or leaf base.",
          "phenophase_additional_definition": "",
          "seq_num": 10,
          "color": "Green1",
          "abundance_category": -1,
          "raw_abundance": false
        },
        "metric": {
          "id": "num_yes_records",
          "sampleSize": "status_records_sample_size",
          "label": "Total Yes Records"
        }
      }
    ]
};

const TIME_SERIES_MAY_8 = {
  "$class": "AgddTimeSeriesSelection",
  "guid": "7ae58e6c-4318-41d9-a2fb-1f4a5e1c3497",
  "meta": {},
  "layerCategory": "Daily Temperature Accumulations",
  "layerName": "gdd:agdd",
  "extentValue": "2019-05-08T00:00:00.000Z",
  /*"latLng": [
    44.12534339967215,
    -91.71142735875947
  ],*/
  "doy": 160
};

// MOCK configuration to be replaced by a server side JSON or similar.
const CONFIGURATION:StoriesConfiguration = {
    /* supply a new image to change the background image like below.
    backgroundImage: 'https://stmed.net/sites/default/files/bark-wallpapers-27771-4214403.jpg',
    */
    "stories":[{
        "title": 'Maple bud out 2017 vs 2018',
        "tagline": 'Will change species title format to scientific...',
        "description": `
        <p>Red and sugar maples in latin</p>
        <p><img src='https://cf.ltkcdn.net/garden/images/std/189484-200x266-Fall-Sugar-Maple.jpg' alt='maple' /></p>
        <p>That there is a picture of a maple tree...</p>
        `,
        "settings": {
            "speciesTitleFormat": SpeciesTitleFormat.ScientificName
        },
        "external": MAPLES_BLB_2017_2018
    },{
        "title": 'Maple colors 2017 vs 2018',
        "tagline": 'How did maple leaf colors stack up between 2017 and 2018?',
        "description": `
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris vestibulum risus ipsum, vel accumsan dolor suscipit ac. Nunc sit amet magna ex. Phasellus posuere tincidunt nisi, et pulvinar mauris tempor a. Cras egestas justo vitae arcu pellentesque suscipit. Sed sodales, dolor quis ultrices blandit, libero sapien ultricies urna, sit amet posuere ligula tortor a magna. Aenean sit amet nisl eu eros tristique suscipit. Quisque convallis pharetra dignissim. Suspendisse potenti. Cras in accumsan tortor. Nunc mollis euismod ante, et ullamcorper nibh condimentum vitae. Sed malesuada, dolor ac consequat facilisis, enim magna consequat nisi, vitae iaculis mi urna et elit. Aliquam erat volutpat.</p>
        <p>Pellentesque eu felis accumsan, cursus dui eget, congue sem. Mauris orci mauris, accumsan vel ullamcorper ac, feugiat ut felis. Nam egestas arcu magna, vel pellentesque purus consequat et. Nam eleifend, tortor a aliquam aliquam, lacus arcu consectetur nulla, eu molestie velit dui eu ligula. Maecenas tincidunt interdum sapien id hendrerit. Proin a lorem aliquet lectus tincidunt facilisis et at augue. Nulla eget porta velit. Mauris facilisis molestie convallis.</p>
        `,
        "external": MAPLES_COLORS_2017_2018
    },{
        "title": 'Red vs Sugar activity 2017',
        "tagline": 'Who had more activity?',
        "description": `
        <p>Integer vel dui tellus. Pellentesque gravida nunc vel varius sollicitudin. Etiam sed arcu libero. Phasellus commodo luctus quam, non posuere massa fermentum nec. Aenean in rutrum lectus, ac accumsan eros. Ut suscipit sit amet magna eu laoreet. Praesent tincidunt velit nec turpis facilisis, vel finibus velit accumsan.</p>
        `,
        "external": MAPLES_ACTIVITY_2017
    },{
      "title": "AGDD Where you are for May 8 2019",
      "tagline": "How much temperature has accumulated?",
      "description": `
      <p>Heat accumulation in the spring is commonly used to predict the timing of phenological transitions in plants and animals.  Read more about it <a href="https://www.usanpn.org/data/agdd_maps" target="_blank">here</a>.</p>
      `,
      "external": TIME_SERIES_MAY_8
    }]
};