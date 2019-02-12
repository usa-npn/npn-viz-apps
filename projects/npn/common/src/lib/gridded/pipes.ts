import { Pipe, PipeTransform, Injectable } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { parseExtentDate } from './gridded-common';
import { ONE_DAY_MILLIS } from '../visualizations/vis-selection';

const ONE_DAY = (24*60*60*1000);
const JAN_ONE_2010 = new Date(2010,0);
const JAN_ONE_THIS_YEAR = new Date((new Date()).getFullYear(),0);

@Pipe({name: 'legendGddUnits'})
export class LegendGddUnitsPipe implements PipeTransform {
    constructor(private decimalPipe:DecimalPipe) {}
    transform(n:number,includeUnits?:boolean) {
        return this.decimalPipe.transform(n,'1.0-0')+(includeUnits ? ' AGDD' : '');
    }
}

@Pipe({name: 'agddDefaultTodayElevation'})
export class AgddDefaultTodayElevationPipe implements PipeTransform {
    constructor(private datePipe:DatePipe) {}

    transform(values:any[]):any {
        let todayLabel = this.datePipe.transform(new Date(),'MMMM d');
        return (values||[]).reduce((dflt,v) =>{
            return dflt||(v.label == todayLabel ? v : undefined);
        },undefined);
    }
}

@Pipe({name: 'legendAgddAnomaly'})
export class LegendAgddAnomalyPipe implements PipeTransform {
    constructor(private decimalPipe:DecimalPipe) {}
    transform(n:number,includeUnits?:boolean):string {
        if(n === 0) {
            return 'No Difference';
        }
        let lt = n < 0;
        return this.decimalPipe.transform(Math.abs(n),'1.0')+(includeUnits ? ' AGDD ' : ' ')+(lt ? '<' : '>') +' Avg';
    }
}

@Pipe({name: 'agddDefaultTodayTime'})
export class AgddDefaultTodayTimePipe implements PipeTransform {
    constructor(private datePipe:DatePipe) {}

    transform(values:any[]):string {
        let todayLabel = this.datePipe.transform(new Date(),'MMMM d, y');
        return (values||[]).reduce(function(dflt,v){
            return dflt||(v.label == todayLabel ? v : undefined);
        },undefined);
    };
}

@Pipe({name: 'legendSixAnomaly'})
export class LegendSixAnomalyPipe implements PipeTransform {
    transform(n:number):string {
        if(n === 0) {
            return 'No Difference';
        }
        var lt = n < 0,
            abs = Math.abs(n);
        return abs+' Days '+(lt ? 'Early' : 'Late');
    };
}

@Pipe({name: 'legendDoy'})
export class LegendDoyPipe implements PipeTransform {
    constructor(private datePipe:DatePipe) {}

    transform(doy:number,fmt:string,current_year?:boolean):string {
        doy = Math.round(doy);
        if(doy === 0) {
            doy = 1;
        }
        fmt = fmt||'MMM d'; // e.g. Jan 1
        return this.datePipe.transform(new Date((current_year ? JAN_ONE_THIS_YEAR : JAN_ONE_2010).getTime()+((doy-1)*ONE_DAY)),fmt);
    }
}

@Pipe({name: 'extentDates'})
export class ExtentDatesPipe implements PipeTransform {
    constructor(private datePipe:DatePipe) {}

    toTime(s:string):number {
        let d = new Date();
        if(s === 'yesterday' || s === 'today' || s === 'tomorrow') {
            if(s === 'yesterday') {
                d.setTime(d.getTime()-ONE_DAY);
            } else if (s === 'tomorrow') {
                d.setTime(d.getTime()+ONE_DAY);
            }
            s = this.datePipe.transform(d,'yyyy-MM-dd 00:00:00');
        } else if(s.indexOf('T') === -1) {
            s = d.getFullYear()+'-'+s+' 00:00:00';
        }
        return parseExtentDate(s).getTime();
    }

    transform(arr:string[],after:string,before:string):string[] {
        var a = after ? this.toTime(after) : undefined,
            b = before ? this.toTime(before) : undefined;
        if(a || b) {
            arr = arr.filter((d) => {
                var t = parseExtentDate(d).getTime();
                return (!a || (a && t > a)) && (!b || (b && t < b));
            });
        }
        return arr;
    }
}

export enum DoyTxType {
    DATE = 'date',
    DOY_STRING = 'doy', // as used by WMS extents e.g. 1.0
    LABEL = 'label'
}
const DOY_LABEL_FMT = 'MMMM d';

@Pipe({name: 'thirtyYearAvgDayOfYear'})
export class ThirtyYearAvgDayOfYearPipe implements PipeTransform {
    constructor(private datePipe:DatePipe) {}

    transform(input:string | Date,txTo:DoyTxType = DoyTxType.LABEL):any {
        if(typeof(input) === 'string') {
            const doy = parseFloat(input);
            if(!isNaN(doy)) {
                input = new Date(JAN_ONE_2010.getTime()+((doy-1)*ONE_DAY));
            }
        }
        if (input instanceof Date) {
            switch(txTo) {
                case DoyTxType.DATE:
                    return input;
                case DoyTxType.LABEL:
                    return this.datePipe.transform(input,DOY_LABEL_FMT);
                case DoyTxType.DOY_STRING:
                    if(input.getFullYear() !== 2010) {
                        input.setFullYear(2010);
                    }
                    input.setHours(0,0,0,0);
                    const diff = input.getTime() - JAN_ONE_2010.getTime();
                    const doy = (diff/ONE_DAY_MILLIS)+1.0;
                    return doy.toFixed(1);
            }
        }
        console.warn(`ThirtyYearAvgDayOfYearPipe.transform unexpected input for translation to "${txTo}"`,input);
        return input;
    }
}

@Injectable()
export class GriddedPipeProvider {
    readonly pipes:any = {};

    constructor(
        private extentDates:ExtentDatesPipe,
        private legendDoy:LegendDoyPipe,
        private legendSixAnomaly:LegendSixAnomalyPipe,
        private agddDefaultTodayTime:AgddDefaultTodayTimePipe,
        private legendAgddAnomaly:LegendAgddAnomalyPipe,
        private agddDefaultTodayElevation:AgddDefaultTodayElevationPipe,
        private legendGddUnits:LegendGddUnitsPipe,
        private thirtyYearAvgDayOfYear:ThirtyYearAvgDayOfYearPipe,
        private date:DatePipe
    ) {
        this.pipes.extentDates = extentDates;
        this.pipes.legendDoy = legendDoy;
        this.pipes.legendSixAnomaly = legendSixAnomaly;
        this.pipes.agddDefaultTodayTime = agddDefaultTodayTime;
        this.pipes.legendAgddAnomaly = legendAgddAnomaly;
        this.pipes.agddDefaultTodayElevation = agddDefaultTodayElevation;
        this.pipes.legendGddUnits = legendGddUnits;
        this.pipes.thirtyYearAvgDayOfYear = thirtyYearAvgDayOfYear;
        this.pipes.date = date;
    }

    get(pipeName:string):PipeTransform {
        return this.pipes[pipeName];
    }
}