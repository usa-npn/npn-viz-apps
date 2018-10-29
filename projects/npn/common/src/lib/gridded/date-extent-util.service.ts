import { Injectable } from '@angular/core';

const FMT_REGEX = /^(\d\d\d\d)-0?(\d+)-0?(\d+)/;
@Injectable()
export class DateExtentUtil {
    parse(s: string): Date {
        let match = FMT_REGEX.exec(s.replace(/T.*$/, '')),
            year = parseInt(match[1]),
            month = parseInt(match[2]) - 1,
            day = parseInt(match[3]);
        return new Date(year, month, day);
    }
}
