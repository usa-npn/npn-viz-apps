import {ObservationDateVisSelection} from '../observation-date-vis-selection';

import {selectionProperty} from '../vis-selection';

export class CalendarSelection extends ObservationDateVisSelection {
    @selectionProperty()
    $class:string = 'CalendarSelection';

    @selectionProperty()
    labelOffset:number = 4;
    @selectionProperty()
    bandPadding:number = 0.5;
    @selectionProperty()
    fontSizeDelta:number = 0;
    @selectionProperty()
    monthFormat?:string;

    isValid():boolean {
        return typeof(this.labelOffset) === 'number' &&
               typeof(this.bandPadding) === 'number' &&
               typeof(this.fontSizeDelta) === 'number' &&
                super.isValid();
    }
}

export {ObservationDataDataPoint,ObservationDateData} from '../observation-date-vis-selection';
