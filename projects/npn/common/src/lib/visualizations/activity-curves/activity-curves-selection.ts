import { HttpParams } from '@angular/common/http';
import { DatePipe } from '@angular/common';

import { NpnServiceUtils, TaxonomicSpeciesRank, TaxonomicPhenophaseRank, getSpeciesPlotKeys, SpeciesService, NetworkService, getStaticColor } from '../../common';

import { INTERPOLATE, ActivityCurve } from './activity-curve';
import { StationAwareVisSelection, selectionProperty, BASE_POP_INPUT, POPInput } from '../vis-selection';

export class ActivityFrequency {
    value:string|number;
    label:string;
}
export const ACTIVITY_FREQUENCY_MONTHLY:ActivityFrequency = {
    value: 'months',
    label: 'Monthly'
};
export const ACTIVITY_FREQUENCY_BIWEEKLY:ActivityFrequency = {
    value: 14,
    label: 'Bi-weekly'
};
export const ACTIVITY_FREQUENCY_WEEKLY:ActivityFrequency = {
    value: 7,
    label: 'Weekly'
};
export const ACTIVITY_FREQUENCIES:ActivityFrequency[] = [
    ACTIVITY_FREQUENCY_MONTHLY,
    ACTIVITY_FREQUENCY_BIWEEKLY,
    ACTIVITY_FREQUENCY_WEEKLY
];

// @dynamic
export class ActivityCurvesSelection extends StationAwareVisSelection {
    $supportsPop:boolean = true;

    @selectionProperty()
    $class:string = 'ActivityCurvesSelection';

    defaultInterpolate = INTERPOLATE.monotone;
    @selectionProperty()
    private _interpolate: INTERPOLATE = INTERPOLATE.monotone;
    @selectionProperty()
    private _dataPoints:boolean = true;
    defaultFrequency = ACTIVITY_FREQUENCIES[0];
    @selectionProperty({
        ser: d => d,
        des: d => {
            // when deserializing re-align with the actual metric object
            // so equality checks elsewhere work.
            return !!d
                ? ACTIVITY_FREQUENCIES.find(af => d.value === af.value)
                : d;
        }
    })
    private _frequency:ActivityFrequency = ACTIVITY_FREQUENCIES[0];
    @selectionProperty({
        ser: d => d ? d.external : undefined,
        des: d => {
            let ac = new ActivityCurve();
            ac.external = d;
            return ac;
        }
    })
    private _curves:ActivityCurve[];

    constructor(
        public serviceUtils:NpnServiceUtils,
        public datePipe: DatePipe,
        public speciesService:SpeciesService,
        public networkService:NetworkService
    ) {
        super(serviceUtils,networkService);
        this.curves = [{color:'#0000ff',orient:'left'},{color:'orange',orient:'right'}].map((o,i) => {
            let c = new ActivityCurve();
            c.id = i;
            c.color = o.color;
            c.orient = o.orient;
            return c;
        });
    }

    toPOPInput(input:POPInput = {...BASE_POP_INPUT}):Promise<POPInput> {
        return super.toPOPInput(input)
            .then(input => {
                const yearRange = this.validCurves.reduce((range,curve) => {
                        if(!range) {
                            return [curve.year,curve.year];
                        }
                        if(curve.year < range[0]) {
                            range[0] = curve.year;
                        }
                        if(curve.year > range[1]) {
                            range[1] = curve.year;
                        }
                        return range;
                    },undefined);
                if(yearRange) {
                    input.startDate = `${yearRange[0]}-01-01`;
                    input.endDate = `${yearRange[1]}-12-31`;
                }
                return this.speciesService.getSpeciesIds(this.validCurves)
                    .then(ids => {
                        input.species = ids;
                        return input;
                    });
            });
    }

    hasValidCurve():boolean {
        return this.validCurves.length > 0;
    }

    isValid(): boolean {
        return  typeof(this._interpolate) === 'number' && // is a numeric based enum with a 0
            !!this._frequency &&
            this.hasValidCurve();
    }

    private updateCheck(requiresUpdate?:boolean) {
        const anyValid = this.hasValidCurve();
        const anyPlotted = this.curves.reduce((plotted,curve) => (plotted||curve.plotted()),false);
        if(requiresUpdate) {
            if(anyValid) {
                this.update();
            }
        } else {
            if(anyValid && anyPlotted) {
                this.redraw();
            } else if (anyValid) {
                this.update();
            }
        }
    }

    set frequency(f:ActivityFrequency) {
        this._frequency = f;
        // any change in frequency invalidates any data held by curves
        (this._curves||[]).forEach(c => c.data(null));
        this.updateCheck(true);
    }

    get frequency():ActivityFrequency {
        return this._frequency;
    }

    set interpolate(i:INTERPOLATE) {
        this._interpolate = i;
        (this._curves||[]).forEach(c => c.interpolate = i);
        this.updateCheck();
    }

    get interpolate():INTERPOLATE {
        return this._interpolate;
    }

    get dataPoints():boolean {
        return this._dataPoints;
    }
    set dataPoints(dp:boolean) {
        this._dataPoints = dp;
        (this._curves||[]).forEach(c => c.dataPoints = dp);
        this.updateCheck(false);
    }

    set curves(cs:ActivityCurve[]) {
        this._curves = cs;
        (this._curves||[]).forEach(c => {
            c.selection = this;
            c.interpolate = this._interpolate;
            c.dataPoints = this._dataPoints;
        });
    }

    get curves():ActivityCurve[] {
        return this._curves;
    }

    get validCurves():ActivityCurve[] {
        return (this._curves||[]).filter(c => c.isValid());
    }

    /**
     * Load all the curves and their data.  It's ipmortant to understand that this function
     * may return more curves than are defined on the selection and the resulting curves may
     * not be references to those held on this selection.
     */
    loadCurves(): Promise<ActivityCurve[]> {
        this.working = true;
        return this.toURLSearchParams(new HttpParams()
                .set('request_src','npn-vis-activity-curves')
                .set('frequency',`${this.frequency.value}`)
            ).then((baseParams:HttpParams) => {
                const promises:Promise<ActivityCurve[]>[] = this.curves
                    .filter(c => (c.data(null) as ActivityCurve).isValid())
                    .map(c => c.loadData(baseParams));
                return Promise.all(promises)
                    .then((curves:ActivityCurve[][]) => {
                        this.working = false;
                        const toPlot = curves.reduce((arr,list) => arr.concat(list),[]);
                        if(this.groups && this.groups.length) {
                            toPlot.forEach((curve,index) => curve.color = getStaticColor(index));
                        }
                        return toPlot;
                    })
                    .catch(err => {
                        this.working = false;
                        //throw err;
                        this.handleError(err);
                        return [];
                    });
            });    
    }

    protected handleError(error: any): void {
        console.error('ERROR',error);
    }
}
