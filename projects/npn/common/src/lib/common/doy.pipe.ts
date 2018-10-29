import {Pipe,PipeTransform} from '@angular/core';

const ONE_DAY_MILLIS = (24*60*60*1000);

@Pipe({name: 'doy'})
export class DoyPipe implements PipeTransform {
    transform(date,ignoreLeapYear?:boolean): any {
        if(typeof(date) === 'string') {
            var parts = date.split('-');
            if(parts.length === 3) {
                var year = parseInt(parts[0]),
                    month = parseInt(parts[1]),
                    day = parseInt(parts[2]);
                if(!isNaN(year) && !isNaN(month) && !isNaN(day) && month < 13 && day < 32) {
                    date = new Date(year,(month-1),day);
                }
            }
        }
        if(date instanceof Date) {
            date = new Date(date.getTime());
            if(ignoreLeapYear) {
                // ignore leap years, using 2010 which is known to be a non-leap year
                date.setFullYear(2010);
            }
            var doy = date.getDate();
            while (date.getMonth() > 0) {
                // back up to the last day of the last month
                date.setDate(1);
                date.setTime(date.getTime()-ONE_DAY_MILLIS);
                doy += date.getDate();
            }
            return doy;
        }
        return date;
    }
}
