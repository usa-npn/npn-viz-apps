import { Component } from "@angular/core";
import { Router } from '@angular/router';
import { SharingService } from '../explore_pheno/sharing.service';
import { RoutePath } from '../../route-path';

interface CannedVisualization {
    title: string;
    tagline: string;
    selection?: any;
}
@Component({
    template: `
    <div id="stories">
        <div class="top">
            <mat-form-field class="zip-code" color="warn">
                <input matInput placeholder="Enter your zip code" type="text" />
            </mat-form-field>
        </div>
        <ul class="bottom">
            <li class="canned-vis-wrapper" *ngFor="let cv of cannedVisualizations">
                <div class="canned-vis" (click)="visitCanned(cv)">
                    <div class="title">{{cv.title}}</div>
                    <p class="tagline">{{cv.tagline}}</p>
                </div>
            </li>
        </ul>
    </div>
    `
})
export class StoriesComponent {
    cannedVisualizations:CannedVisualization[] = [{
        title: 'Maple bud out 2017 vs 2018',
        tagline: 'How did maples budding out stack up between 2017 and 2018?',
        selection: MAPLES_BLB_2017_2018
    },{
        title: 'Maple colors 2017 vs 2018',
        tagline: 'How did maple leaf colors stack up between 2017 and 2018?',
        selection: MAPLES_COLORS_2017_2018
    },{
      title: 'Minnesota red maples 2016',
      tagline: 'Just red maples on a map',
      selection: MN_RED_MAPLES_2016
    },{
        title: 'Local observations',
        tagline: 'What species are citizen scientists tracking in my area?'
    },{
        title: 'When will fall color change begin?',
        tagline: 'When has the color peaked over the past 10 years?'
    }]

    constructor(
        private router:Router,
        private sharingService:SharingService
    ) {}

    visitCanned(vis:CannedVisualization) {
        if(vis.selection) {
            this.router.navigate([
                RoutePath.EXPLORE_PHENO,
                {s: this.sharingService.serializeExternal(vis.selection)}
            ])
        }
    }
}

const MN_RED_MAPLES_2016 = {
  "$class": "MapSelection",
  "guid": "08e61546-319d-4908-a449-945b521b9960",
  "meta": {},
  "networkIds": [],
  "stationIds": [],
  "individualPhenometrics": false,
  "opacity": 0.75,
  "plots": [
    {
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
      }
    }
  ],
  "boundaryTypeId": 1,
  "boundaryId": 13,
  "year": 2016
};

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
};/*{
    "$class": "ScatterPlotSelection",
    "guid": "8e31fd43-e770-424a-b1a2-3f168f5a9c75",
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
          "phenophase_id": 498,
          "phenophase_name": "Colored leaves",
          "phenophase_category": "Leaves",
          "phenophase_definition": "One or more leaves show some of their typical late-season color, or yellow or brown due to drought or other stresses. Do not include small spots of color due to minor leaf damage, or dieback on branches that have broken. Do not include fully dried or dead leaves that remain on the plant.",
          "phenophase_additional_definition": "",
          "seq_num": 70,
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
          "phenophase_id": 498,
          "phenophase_name": "Colored leaves",
          "phenophase_category": "Leaves",
          "phenophase_definition": "One or more leaves show some of their typical late-season color, or yellow or brown due to drought or other stresses. Do not include small spots of color due to minor leaf damage, or dieback on branches that have broken. Do not include fully dried or dead leaves that remain on the plant.",
          "phenophase_additional_definition": "",
          "seq_num": 70,
          "color": "Green1",
          "abundance_category": -1,
          "raw_abundance": false
        }
      }
    ],
    "filterDisclaimer": "For quality assurance purposes, only onset dates that are preceded by negative records are included in the visualization."
  };*/