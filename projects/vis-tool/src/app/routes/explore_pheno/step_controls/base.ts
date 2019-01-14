import { StepComponent, ControlComponent, StepState, VisDefinition } from '../interfaces';
import { VisSelection } from '@npn/common';

export abstract class BaseStepComponent implements StepComponent {
    templateSelection:VisSelection;
    selection:VisSelection;

    definition:VisDefinition;
    // the desired behavior is that a step component shows no info
    // beneath it until it as been visited (regardless of defaults).
    // which is why the 'templateSelection' exists
    // this is intended to allow sub-classes to easily repopulate
    // defaults by specifying their associated keys here.
    protected defaultPropertyKeys:string[];
    visited:boolean = false;

    stepVisit():void {
        if(!this.visited) {
            this.visited = true;
            (this.defaultPropertyKeys||[]).forEach(key => {
                if(this.selection[key] === undefined) {
                    this.selection[key] = this.definition.templateSelection[key];
                }
            })
            console.log('after populating defaults');
            console.log('selection',this.selection);
            console.log('templateSelection',this.definition.templateSelection);
        }
    }

    // subclasses should over-ride.
    get state():StepState {
        return this.visited
            ? StepState.AVAILABLE
            : StepState.UNAVAILABLE;
    }
}

export class BaseControlComponent implements ControlComponent {

}