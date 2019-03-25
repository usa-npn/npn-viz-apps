import { StepComponent, ControlComponent, SubControlComponent, StepState, VisDefinition, VisConfigStepComponent } from '../interfaces';
import { VisSelection, MonitorsDestroy } from '@npn/common';
import { Subject } from 'rxjs';

abstract class ComponentBase extends MonitorsDestroy implements VisConfigStepComponent {
    title:string = 'not set';
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

    get complete():boolean {
        return this.selection.$shared
            ? true
            : this.state === StepState.COMPLETE;
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
            this.selection.pause();
            try {
                (this.defaultPropertyKeys||[]).forEach(key => {
                    if(this.selection[key] === undefined) {
                        this.selection[key] = this.definition.templateSelection[key];
                    }
                })
            } finally {
                this.selection.resume();
            }
            // console.log('ControlComponent: after populating defaults');
            // console.log('ControlComponent: selection',this.selection);
            // console.log('ControlComponent: templateSelection',this.definition.templateSelection);
        }
    }
}

export class BaseSubControlComponent extends ComponentBase implements SubControlComponent {
    $fullScreen:boolean = false;
    $closeDisabled:boolean = false;
    visibility:Subject<boolean> = new Subject();

    show() {
        this.visibility.next(true);
    }

    hide() {
        this.visibility.next(false);
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        this.visibility.complete();
    }
}