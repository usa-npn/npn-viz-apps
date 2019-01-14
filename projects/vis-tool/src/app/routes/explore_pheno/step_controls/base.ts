import { StepComponent, ControlComponent, StepState, VisDefinition, VisConfigComponent } from '../interfaces';
import { VisSelection } from '@npn/common';

abstract class ComponentBase implements VisConfigComponent {
    templateSelection:VisSelection;
    selection:VisSelection;
    definition:VisDefinition;
    visited:boolean = false;
}

export abstract class BaseStepComponent extends ComponentBase implements StepComponent {
    // subclasses should over-ride.
    get state():StepState {
        return this.visited
            ? StepState.AVAILABLE
            : StepState.UNAVAILABLE;
    }
}

export class BaseControlComponent extends ComponentBase implements ControlComponent {
    // the desired behavior is that a step component shows no info
    // beneath it until it as been visited (regardless of defaults).
    // which is why the 'templateSelection' exists
    // this is intended to allow sub-classes to easily repopulate
    // defaults by specifying their associated keys here.
    protected defaultPropertyKeys:string[];

    stepVisit():void {
        if(!this.visited) {
            this.visited = true;
            (this.defaultPropertyKeys||[]).forEach(key => {
                if(this.selection[key] === undefined) {
                    this.selection[key] = this.definition.templateSelection[key];
                }
            })
            console.log('ControlComponent: after populating defaults');
            console.log('ControlComponent: selection',this.selection);
            console.log('ControlComponent: templateSelection',this.definition.templateSelection);
        }
    }
}