import {Injectable,PipeTransform} from '@angular/core';

import {LegendGddUnitsPipe,AgddDefaultTodayElevationPipe,LegendAgddAnomalyPipe,
        AgddDefaultTodayTimePipe,LegendSixAnomalyPipe,LegendDoyPipe,ExtentDatesPipe} from './pipes';

// since there is no $filter to magically discover filters/pipes
// this class exist to catch all pipes that are used by WmsMapLayer/Legend
// per the layer definitions so they can be retrived by "name" abstractly
@Injectable()
export class WmsPipeFactory {
    private pipes:any = {};

    constructor(
        private legendGddUnits:LegendGddUnitsPipe,
        private agddDefaultTodayElevation:AgddDefaultTodayElevationPipe,
        private legendAgddAnomaly:LegendAgddAnomalyPipe,
        private agddDefaultTodayTime:AgddDefaultTodayTimePipe,
        private legendSixAnomaly:LegendSixAnomalyPipe,
        private legendDoy:LegendDoyPipe,
        private extentDates:ExtentDatesPipe) {
        this.pipes.legendGddUnits = legendGddUnits;
        this.pipes.agddDefaultTodayElevation = agddDefaultTodayElevation;
        this.pipes.legendAgddAnomaly = legendAgddAnomaly;
        this.pipes.agddDefaultTodayTime = agddDefaultTodayTime;
        this.pipes.legendSixAnomaly = legendSixAnomaly;
        this.pipes.legendDoy = legendDoy;
        this.pipes.extentDates = extentDates;
    }

    getPipe(pipeName:string):PipeTransform {
        return this.pipes[pipeName];
    }
}
