import { HttpParams } from '@angular/common/http';

import { StationAwareVisSelection, selectionProperty, POPInput, BASE_POP_INPUT, SelectionGroup, GroupHttpParams } from './vis-selection';
import { NpnServiceUtils, SpeciesPlot, TaxonomicSpeciesTitlePipe, getSpeciesPlotKeys, SpeciesService, NetworkService, ObservationDateService, ObservationDateRow, getStaticColor, CURRENT_YEAR, CURRENT_YEAR_VALUE  } from '../common';

export interface ObservationDatePlot extends SpeciesPlot {
    [x: string]: any;
}

export interface ObservationDataDataPoint {
    x: number;
    y: number;
    color: string;
}
export interface ObservationDateData {
    labels: string[];
    data: ObservationDataDataPoint[];
}

export interface ObservationDatePlotData {
    plot: ObservationDatePlot;
    group?: SelectionGroup;
    /** The rows of `/v1/data/observation_dates` belonging to this plot. */
    data: ObservationDateRow[];
}

/**
 * One (plot,group) pair and the request it will be served by.  Plots sharing a group, a
 * taxonomic rank and a phenophase grain share a single request; see `fetchPlotData`.
 */
interface PlotRequest {
    plot: ObservationDatePlot;
    group?: SelectionGroup;
    /** Position in the group params list -- part of the bucket key, so groups never share a request. */
    groupIndex: number;
    params: HttpParams;
    speciesIdKey: string;
    phenophaseIdKey: string;
    speciesId: any;
    phenophaseId: any;
    data?: ObservationDateRow[];
}

export abstract class ObservationDateVisSelection extends StationAwareVisSelection {
    $supportsPop:boolean = true;

    @selectionProperty()
    negative: boolean = false;
    @selectionProperty()
    negativeColor: string = '#aaa'
    @selectionProperty()
    years: number[] = [];
    @selectionProperty()
    plots: ObservationDatePlot[] = [];

    /** The maximum number of plots we want to allow. */
    readonly MAX_PLOTS:number = 10;

    constructor(
        protected serviceUtils:NpnServiceUtils,
        protected speciesTitle:TaxonomicSpeciesTitlePipe,
        protected speciesService:SpeciesService,
        protected networkService:NetworkService,
        protected observationDateService:ObservationDateService
    ) {
        super(serviceUtils,networkService);
    }

    isValid(): boolean {
        return this.years && this.years.length && this.validPlots.length > 0;
    }

    get validPlots(): ObservationDatePlot[] {
        return (this.plots || []).filter(p => {
            return p.species && p.phenophase && 
                // color only required if not grouping
                (p.color || (this.groups && this.groups.length > 0));
        });
    }

    get actualYears():number[] {
        return (this.years||[]).map(y => y === CURRENT_YEAR ? CURRENT_YEAR_VALUE : y);
    }

    /**
     * Indicates whether or not adding one more plot will result in a visualization exceeding
     * the maximum number of allowed plots.
     */
    get canAddPlot():boolean {
        const years = this.years ? this.years.length : 0;
        const groups = this.groups ? this.groups.length : 0;
        const next_plots = ((this.plots ? this.plots.length : 0)+1)*years;
        const next_count = groups ? (groups * next_plots) : next_plots;
        return next_count <= this.MAX_PLOTS;
    }

    /**
     * Note there is no `request_src` here any more -- `/v1/data/observation_dates` rejects
     * unknown fields outright (`additionalProperties: false`), so sending it is a 400.  It
     * was vestigial regardless: every caller sent the base class default because
     * `CalendarSelectionFactory.newSelection()` never applied its own value.
     */
    toURLSearchParams(params: HttpParams = new HttpParams()): Promise<HttpParams> {
        this.actualYears.forEach((y, i) => {
            params = params.set(`year[${i}]`, `${y}`);
        });
        return super.toURLSearchParams(params);
    }

    toPOPInput(input:POPInput = {...BASE_POP_INPUT}):Promise<POPInput> {
        return super.toPOPInput(input)
            .then(input => {
                const yearRange = this.actualYears
                    .reduce((range,y) => {
                        if(!range) {
                            return [y,y];
                        }
                        if(y < range[0]) {
                            range[0] = y;
                        }
                        if(y > range[1]) {
                            range[1] = y;
                        }
                        return range;
                    },undefined);
                if(yearRange) {
                    input.startDate = `${yearRange[0]}-01-01`;
                    input.endDate = `${yearRange[1]}-12-31`;
                }
                return this.speciesService.getSpeciesIds(this.validPlots)
                    .then(ids => {
                        input.species = ids;
                        return input;
                    });
            });
    }

    postProcessData(data: ObservationDatePlotData[]): ObservationDateData {
        if (!data || !data.length) {
            return null;
        }
        const plots = data.map(d => d.plot);
        let y = (plots.length * this.years.length) -1;
        const addDoys = (doys, color) => {
            doys.forEach(doy => {
                response.data.push({
                    y: y,
                    x: doy,
                    color: color
                });
            });
        };
        const response:ObservationDateData = {
            labels: [],
            data: []
        };
        data.forEach(d => {
            const plot = d.plot;
            const group = d.group;
            // Group this plot's flat rows by year.  `status` is numeric: 1 is a day the
            // phenophase was reported yes, 0 a day it was reported no.  Every row the
            // endpoint returns is a data point for its day -- `count` is not consulted
            // (it is neither an intensity nor an abundance value).
            const byYear = (d.data||[]).reduce((map,row) => {
                    const yearData = map[row.year] || (map[row.year] = {positive:[],negative:[]});
                    (row.status === 1 ? yearData.positive : yearData.negative).push(row.day_of_year);
                    return map;
                },{} as {[year:number]:{positive:number[];negative:number[]}});
            this.actualYears.forEach(year => {
                const yearData = byYear[year];
                if(yearData) {
                    // positive first: a day can be both (reported yes by one site, no by
                    // another) and the two points differ in color, so the d3 join in
                    // calendar.component.ts -- keyed on (y,x,color) -- draws both, one
                    // atop the other.  That component inserts at `:first-child`, which
                    // reverses data order in the DOM, and SVG paints the last element in
                    // document order on top; so the point pushed *first* here is the one
                    // that ends up visible.  Positive data wins.
                    addDoys(yearData.positive,plot.color);
                    if(this.negative) {
                        addDoys(yearData.negative,this.negativeColor);
                    }
                }
                const pp = plot.phenophase as any;
                response.labels.splice(0, 0, 
                    ` ${year}: `+
                    this.speciesTitle.transform(plot.species,plot.speciesRank) +
                    ' - '+
                    (pp.phenophase_name||pp.pheno_class_name)+
                    (!!group ? ` (${group.label})` : ''));
                y--;
            })
        });
        console.log('observation data', response);
        return response;
    }

    getData(): Promise<ObservationDatePlotData[]> {
        // work around TypeScript Promise.all issue
        return this._getData();
    }

    private _getData(): Promise<any> {
        if (!this.isValid()) {
            return Promise.reject(this.INVALID_SELECTION);
        }
        this.working = true;
        return this.toURLSearchParams()
            .then(baseParams => (this.groups && this.groups.length)
                // a SelectionGroup partitions by station set, so each group needs its own
                // stations array and therefore its own request(s)
                ? this.toGroupHttpParams(baseParams)
                : Promise.resolve([{group:undefined,params:baseParams} as GroupHttpParams]))
            .then((groupParams:GroupHttpParams[]) => this.fetchPlotData(groupParams))
            .then(result => {
                this.working = false;
                return result;
            })
            .catch(err => {
                this.working = false;
                this.handleError(err);
            });
    }

    /**
     * Issues one request per (group, taxonomic rank, phenophase grain) bucket and
     * demultiplexes the resulting rows back onto the plots that asked for them.
     *
     * `/v1/data/observation_dates` takes a single `taxon` and a single `phenophase_grain`
     * per request and answers with the full cross product of the id arrays it is given.
     * Plots do not have to agree on rank -- each one carries its own `speciesRank` from
     * its `higher-species-phenophase-input` control -- so the plots are bucketed by rank
     * first and the unwanted pairs are dropped here rather than server side.
     *
     * In the vis tool this is always exactly one request: plots are capped at three and
     * groups are never set.  Groups are only ever populated by fws-dashboard.
     */
    private fetchPlotData(groupParams:GroupHttpParams[]):Promise<ObservationDatePlotData[]> {
        const grouped = !!this.groups && this.groups.length > 0;
        const requests:PlotRequest[] = [];
        let plotIndex = 0;
        // plots outer, groups inner -- this ordering both fixes the row order that
        // postProcessData walks and drives the static color sequence in group mode
        this.validPlots.forEach(p => {
            groupParams.forEach((gp,groupIndex) => {
                // in group mode a plot's color comes from its (plot,group) position
                // rather than from the plot itself, so it has to be copied before it is
                // stamped; ungrouped, the plot keeps the color the user picked
                const plot = grouped ? JSON.parse(JSON.stringify(p)) : p;
                if(grouped) {
                    plot.color = getStaticColor(plotIndex++);
                }
                const {speciesIdKey,phenophaseIdKey} = getSpeciesPlotKeys(plot);
                requests.push({
                    plot,
                    group: gp.group,
                    groupIndex,
                    params: gp.params,
                    speciesIdKey,
                    phenophaseIdKey,
                    speciesId: plot.species[speciesIdKey],
                    phenophaseId: plot.phenophase[phenophaseIdKey]
                });
            });
        });
        const buckets = requests.reduce((map,r) => {
                const key = `${r.groupIndex}/${r.speciesIdKey}/${r.phenophaseIdKey}`;
                (map[key] = map[key] || []).push(r);
                return map;
            },{} as {[key:string]:PlotRequest[]});
        const distinct = (values:any[]) => values.filter((v,i) => values.indexOf(v) === i);
        const promises = Object.keys(buckets).map(key => {
            const bucket = buckets[key];
            const {speciesIdKey,phenophaseIdKey} = bucket[0];
            let params = distinct(bucket.map(r => r.speciesId))
                .reduce((p,id,i) => p.set(`${speciesIdKey}[${i}]`,`${id}`),bucket[0].params);
            params = distinct(bucket.map(r => r.phenophaseId))
                .reduce((p,id,i) => p.set(`${phenophaseIdKey}[${i}]`,`${id}`),params);
            return this.observationDateService.getObservationDates(params)
                .then(rows => bucket.forEach(r => {
                    // a bucket holding more than one plot gets back pairs nobody asked
                    // for.  loose equality on purpose: ids reach a selection as both
                    // numbers and strings depending on where the plot came from.
                    r.data = rows.filter(row =>
                        row[r.speciesIdKey] == r.speciesId &&
                        row[r.phenophaseIdKey] == r.phenophaseId);
                }));
        });
        return Promise.all(promises)
            .then(() => requests.map(r => ({plot:r.plot,group:r.group,data:r.data})));
    }
}
