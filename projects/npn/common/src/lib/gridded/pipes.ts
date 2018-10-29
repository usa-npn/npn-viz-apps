import {Pipe,PipeTransform} from '@angular/core';
import {DatePipe,DecimalPipe} from '@angular/common';
import {DateExtentUtil} from './date-extent-util.service';

const ONE_DAY = (24*60*60*1000);
const JAN_ONE_2010 = new Date(2010,0);
const JAN_ONE_THIS_YEAR = new Date((new Date()).getFullYear(),0);

@Pipe({name: 'legendGddUnits'})
export class LegendGddUnitsPipe implements PipeTransform {
    constructor(private decimalPipe:DecimalPipe) {}
    transform(n:number,includeUnits?:boolean) {
        return this.decimalPipe.transform(n,'1.0')+(includeUnits ? ' AGDD' : '');
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
    constructor(private datePipe:DatePipe,private dateExtentUtil:DateExtentUtil) {}

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
        return this.dateExtentUtil.parse(s).getTime();
    }

    transform(arr:string[],after:string,before:string):string[] {
        var a = after ? this.toTime(after) : undefined,
            b = before ? this.toTime(before) : undefined;
        if(a || b) {
            arr = arr.filter((d) => {
                var t = this.dateExtentUtil.parse(d).getTime();
                return (!a || (a && t > a)) && (!b || (b && t < b));
            });
        }
        return arr;
    }
}
