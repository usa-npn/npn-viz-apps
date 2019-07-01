import { HttpParams } from '@angular/common/http';
import { DatePipe } from '@angular/common';

import { NpnServiceUtils, TaxonomicSpeciesRank, Species, TaxonomicPhenophaseRank, TaxonomicClass, TaxonomicOrder, TaxonomicFamily, Phenophase, PhenophaseClass } from '../../common';

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

    constructor(protected serviceUtils:NpnServiceUtils,protected datePipe: DatePipe) {
        super(serviceUtils);
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
                input.species = this.validCurves
                    // TODO POP is currently just working for curves selectin a specific species
                    .filter((c:any) => !!c.species.species_id)
                    .map((c:any) => typeof(c.species.species_id) === 'number' ? c.species.species_id : parseInt(c.species.species_id))
                    .reduce((set,id) => {
                        if(set.indexOf(id) === -1) {
                            set.push(id);
                        }
                        return set;
                    },[]);
                return input;
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

    private endDate(year) {
        var now = new Date();
        if(year === now.getFullYear()) {
            return this.datePipe.transform(now,'yyyy-MM-dd');
        }
        return year+'-12-31';
    }

    loadCurveData(): Promise<any> {
        this.working = true;
        return this.toURLSearchParams(new HttpParams()
                .set('request_src','npn-vis-activity-curves')
                .set('frequency',`${this.frequency.value}`)
            ).then((baseParams:HttpParams) => {
                const promises:Promise<any[]>[] = this.curves
                    .filter(c => c.data(null).isValid())
                    .map(c => {
                        let curveParams = baseParams
                            .set('start_date',`${c.year}-01-01`)
                            .set('end_date',this.endDate(c.year));
                        const rank = c.speciesRank||TaxonomicSpeciesRank.SPECIES;
                        let o;
                        switch(rank) {
                            case TaxonomicSpeciesRank.SPECIES:
                                o = c.species as Species;
                                curveParams = curveParams.set('species_id[0]',`${o.species_id}`);
                                    //.set('phenophase_id[0]',`${c.phenophase.phenophase_id}`);
                                break;
                            case TaxonomicSpeciesRank.CLASS:
                                o = c.species as TaxonomicClass;
                                curveParams = curveParams.set('class_id[0]',`${o.class_id}`)
                                    .set('taxonomy_aggregate','1');
                                break;
                            case TaxonomicSpeciesRank.ORDER:
                                o = c.species as TaxonomicOrder;
                                curveParams = curveParams.set('order_id[0]',`${o.order_id}`)
                                    .set('taxonomy_aggregate','1');
                                break;
                            case TaxonomicSpeciesRank.FAMILY:
                                o = c.species as TaxonomicFamily;
                                curveParams = curveParams.set('family_id[0]',`${o.family_id}`)
                                    .set('taxonomy_aggregate','1');
                                break;
                        }
                        const pRank = c.phenophaseRank||TaxonomicPhenophaseRank.PHENOPHASE;
                        let op;
                        switch(pRank) {
                            case TaxonomicPhenophaseRank.PHENOPHASE:
                                op = c.phenophase as Phenophase;
                                curveParams = curveParams.set('phenophase_id[0]',`${op.phenophase_id}`);
                                break;
                            case TaxonomicPhenophaseRank.CLASS:
                                op = c.phenophase as PhenophaseClass;
                                curveParams = curveParams.set('pheno_class_id[0]',`${op.pheno_class_id}`)
                                    .set('pheno_class_aggregate','1');
                                break;
                        }
                        return this.serviceUtils.cachedPost(this.serviceUtils.apiUrl('/npn_portal/observations/getMagnitudeData.json'),curveParams.toString())
                            .then(data => c.data(data));
                    });
                    return Promise.all(promises)
                        .then(() => this.working = false)
                        .catch(err => {
                            this.working = false;
                            //throw err;
                            this.handleError(err);
                        });
            });        
    }

    protected handleError(error: any): void {
        console.error('ERROR',error);
    }
}
