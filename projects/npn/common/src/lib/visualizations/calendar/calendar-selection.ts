import {ObservationDateVisSelection} from '../observation-date-vis-selection';

import {selectionProperty} from '../vis-selection';
import {FONT_SIZE} from '../visualization-base.component';

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
}

export {ObservationDataDataPoint,ObservationDateData} from '../observation-date-vis-selection';
