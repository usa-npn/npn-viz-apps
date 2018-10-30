import {Species,Phenophase,ScatterPlotSelection,CalendarSelection,
    ActivityCurvesSelection,ActivityCurve,ACTIVITY_CURVE_KINGDOM_METRICS,ACTIVITY_FREQUENCY_WEEKLY,
    ClippedWmsMapSelection,VisSelection,VisualizationSelectionFactory} from '@npn/common';

// TODO - complain to Lee about the inconstent data-types
// species_id:string and phenophase_id:number
const RED_MAPLE:Species = {
    "common_name": "red maple",
    "genus": "Acer",
    "species": "rubrum",
    "kingdom": "Plantae",
    "itis_taxonomic_sn": 28728,
    "species_id": "3"
}
const RED_MAPLE_COLOR = '#15537d';
const SUGAR_MAPLE:Species = {
    "common_name": "sugar maple",
    "genus": "Acer",
    "species": "saccharum",
    "kingdom": "Plantae",
    "itis_taxonomic_sn": 28731,
    "species_id": "61"
}
const SUGAR_MAPLE_COLOR = '#b25809';
const BREAKING_LEAF_BUDS:Phenophase = {
    "phenophase_id": 371,
    "phenophase_name": "Breaking leaf buds",
    "phenophase_category": "Leaves",
    "phenophase_definition": "One or more breaking leaf buds are visible on the plant.  A leaf bud is considered 'breaking' once a green leaf tip is visible at the end of the bud, but before the first leaf from the bud has unfolded to expose the leaf stalk (petiole) or leaf base.",
    "phenophase_additional_definition": "",
    "seq_num": 10,
    "color": "Green1",
    "abundance_category": -1,
    "raw_abundance": false,
    "selected": true,
    "count": 18731
}

export class MockRefuge {
    private selections:string;

    constructor(private visSelectionFactory:VisualizationSelectionFactory) {
        /*
        let selections:VisSelection[] = [];
        selections.push(this.activityCurvesSelection());
        selections.push(this.scatterSelection(2014,2015));
        selections.push(this.calendarSelection(2014,2015));
        let ss = this.scatterSelection(2015,2016);
        ss.regressionLines = false;
        selections.push(ss);
        selections.push(this.calendarSelection(2015,2016));
        selections.push(this.agddSelection());

        // serialize selections to json and re-constitude to validate what will happen eventually
        this.selections = JSON.stringify(selections.map(s => s.external));*/
        this.selections = '[]';
    }

    private scatterSelection(y1:number,y2:number): ScatterPlotSelection {
        let s = this.visSelectionFactory.newScatterPlotSelection();
        s.start = y1;
        s.end = y2;
        s.regressionLines = true;
        s.plots = [{
            species: RED_MAPLE,
            phenophase: BREAKING_LEAF_BUDS,
            color: RED_MAPLE_COLOR
        },{
            species: SUGAR_MAPLE,
            phenophase: BREAKING_LEAF_BUDS,
            color: SUGAR_MAPLE_COLOR
        }];
        return s;
    }

    private calendarSelection(y1:number,y2:number): CalendarSelection {
        let cs = this.visSelectionFactory.newCalendarSelection();
        cs.negative = true;
        //cs.fontSizeDelta = 2; // 2px larger than the base fontSize
        //cs.labelOffset = 10; // default is 4
        cs.years = [y1,y2];
        cs.plots = [{
            species: RED_MAPLE,
            phenophase: BREAKING_LEAF_BUDS,
            color: RED_MAPLE_COLOR
        },{
            species: SUGAR_MAPLE,
            phenophase: BREAKING_LEAF_BUDS,
            color: SUGAR_MAPLE_COLOR
        }];
        return cs;
    }

    private clippedWmsMapSelection():ClippedWmsMapSelection {
        let agdd1 = this.visSelectionFactory.newClippedWmsMapSelection();
        agdd1.image = 'http://data-dev.usanpn.org:3006/SEVILLETA_NATIONAL_WILDLIFE_REFUGE_six_average_leaf_2017-08-01_1506724116276_styled.png';
        agdd1.box =  [
            -107.116877705142,
            34.176506514658,
            -106.487880519877,
            34.4504275244299
        ];
        agdd1.boundary = "http://geoserver-dev.usanpn.org/geoserver/gdd/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=gdd:fws_boundaries&CQL_FILTER=orgname='SEVILLETA NATIONAL WILDLIFE REFUGE'&outputFormat=application/json";
        return agdd1;
    }

    private activityCurvesSelection():ActivityCurvesSelection {
        let ac = this.visSelectionFactory.newActivityCurvesSelection(),
            curve1 = ac.curves[0],
            curve2 = ac.curves[1];
        ac.frequency = ACTIVITY_FREQUENCY_WEEKLY;
        curve1.year = 2015;
        curve1.species = RED_MAPLE;
        curve1.phenophase = BREAKING_LEAF_BUDS;
        curve1.metric = ACTIVITY_CURVE_KINGDOM_METRICS.Plantae[0];

        curve2.year = 2015;
        curve2.species = SUGAR_MAPLE;
        curve2.phenophase = BREAKING_LEAF_BUDS;
        curve2.metric = ACTIVITY_CURVE_KINGDOM_METRICS.Plantae[1];

        return ac;
    }

    getSelections(network_id): string {
        return this.selections;
    }

    saveSelections(network_id,selections:string):string {
        return this.selections = selections;
    }
}
