import {Pipe,PipeTransform} from '@angular/core';
import {DatePipe} from '@angular/common';

const JAN_ONE_2010 = new Date(2010/*(new Date()).getFullYear()*/,0);
const JAN_ONE_THIS_YEAR = new Date((new Date()).getFullYear(),0);
const ONE_DAY = (24*60*60*1000);

/**
 * Simplified version of thirtyYearAvgDayOfYear that simply takes a number day of year
 * and returns a formatted date.  The optional second argument defines the date format
 * which defaults to 'MMM d'.  The optional third argument defines whether or not the
 * current year should be used as oposed to one known to have 365 days (2010).
 *
 * This filter equates doy 0 with doy 1 since legend scales are inconsistent in this regard.
 */
@Pipe({name: 'legendDoy'})
export class LegendDoyPipe implements PipeTransform {
    constructor(private datePipe: DatePipe) {}

    transform(doy,fmt?,current_year?): any {
        doy = Math.round(doy);
        if(doy === 0) {
            doy = 1;
        }
        fmt = fmt||'MMM d'; // e.g. Jan 1
        return this.datePipe.transform(new Date((current_year ? JAN_ONE_THIS_YEAR : JAN_ONE_2010).getTime()+((doy-1)*ONE_DAY)),fmt);
    }
}
