import {Injectable} from '@angular/core';

import {VisSelection} from './vis-selection';
import {ScatterPlotSelection,ScatterPlotSelectionFactory} from './scatter-plot';
import {CalendarSelection,CalendarSelectionFactory} from './calendar';
import {ActivityCurvesSelection,ActivityCurvesSelectionFactory} from './activity-curves';
import {ObserverActivitySelection,ObserverActivitySelectionFactory} from './observer-activity';
import {ObservationFrequencySelection,ObservationFrequencySelectionFactory} from './observation-frequency';
import {ClippedWmsMapSelection,ClippedWmsMapSelectionFactory} from './clipped-wms-map';

@Injectable()
export class VisualizationSelectionFactory {
    private factoryMap:any = {};

    constructor(private calendar: CalendarSelectionFactory,
                private scatter: ScatterPlotSelectionFactory,
                private activity: ActivityCurvesSelectionFactory,
                private observer: ObserverActivitySelectionFactory,
                private observationFreq: ObservationFrequencySelectionFactory,
                private clippedWmsMap: ClippedWmsMapSelectionFactory) {
        this.factoryMap.CalendarSelection = calendar;
        this.factoryMap.ScatterPlotSelection = scatter;
        this.factoryMap.ActivityCurvesSelection = activity;
        this.factoryMap.ObserverActivitySelection = observer;
        this.factoryMap.ObservationFrequencySelection = observationFreq;
        this.factoryMap.ClippedWmsMapSelection = clippedWmsMap;
    }

    newCalendarSelection():CalendarSelection {
        return this.calendar.newSelection();
    }

    newScatterPlotSelection():ScatterPlotSelection {
        return this.scatter.newSelection();
    }

    newActivityCurvesSelection():ActivityCurvesSelection {
        return this.activity.newSelection();
    }

    newObserverActivitySelection():ObserverActivitySelection {
        return this.observer.newSelection();
    }
    
    newObservationFrequencySelection(): ObservationFrequencySelection {
        return this.observationFreq.newSelection();
    }

    newClippedWmsMapSelection(): ClippedWmsMapSelection {
        return this.clippedWmsMap.newSelection();
    }

    cloneSelection(selection:VisSelection): VisSelection {
        return this.newSelection(selection.external);
    }

    newSelections(selections:any[]): VisSelection[] {
        return selections.map(s => this.newSelection(s));
    }

    newSelection(selection:any): VisSelection {
        if(!this.factoryMap[selection.$class]) {
            throw new Error(`Unknown selection type "${selection.$class}"`);
        }
        let s:VisSelection = this.factoryMap[selection.$class].newSelection();
        s.external = selection;
        return s
    }
}
