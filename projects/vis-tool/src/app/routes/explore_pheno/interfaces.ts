import { ComponentType } from "@angular/cdk/portal";
import { VisSelection } from '@npn/common';

import { IconDefinition } from '@fortawesome/pro-light-svg-icons';

/**
 * Simple component that displays, in a list, the portions of its
 * selection its corresponding control is responsible for.
 */
export interface StepComponent {
    selection?: any; //VisSelection;
    control?: ControlComponent;
    [x:string]: any;
}
/**
 * UI control/s that manipulate a portion of its
 * selection.
 */
export interface ControlComponent {
    selection?: any; //VisSelection;
    step?: StepComponent;
    [x:string]: any;
}

export interface VisConfigStep {
    title: string;
    icon: IconDefinition;
    stepComponent: ComponentType<StepComponent>;
    controlComponent: ComponentType<ControlComponent>;
}

export interface VisDefinition {
    title: string;
    icon: IconDefinition;
    description?: string;
    
    selection?: any; //VisSelection;
    steps?: VisConfigStep[];
    component?: ComponentType<any>; // the actual visualization
}