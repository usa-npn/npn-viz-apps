import { ComponentType } from "@angular/cdk/portal";
import { IconDefinition } from '@fortawesome/pro-light-svg-icons';

/**
 * Base interface for the other components.
 */
export interface VisConfigComponent {
    /** The selection object used as input for the visualization (likely an instance of VisSelection) */
    selection?: any;
    /** Any other properties the control may need to function */
    [prop:string]: any;
}

/**
 * Simple component that displays, in a list, the portions of its
 * selection its corresponding control is responsible for.
 */
export interface StepComponent extends VisConfigComponent {
    /** The corresponding control component */
    control?: ControlComponent;
}
/**
 * UI control/s that manipulate a portion of its
 * selection.
 */
export interface ControlComponent extends VisConfigComponent {
    /** The corresponding step component */
    step?: StepComponent;
}

/**
 * Defines a single step in the gathering of user input for a visualization.
 */
export interface VisConfigStep {
    /** The title to be displayed over the step next to its icon. */
    title: string;
    /** The icon to display in the step list. */
    icon: IconDefinition;
    /** To be displayed at the top of the control area (default title) */
    controlTitle?: string;
    /** The component that displays the selection from its corresponding control component. */
    stepComponent: ComponentType<StepComponent>;
    /** The component that gathers user inpur for the step. */
    controlComponent: ComponentType<ControlComponent>;
}

/**
 * Wraps up all the information required to gather user input and display a visualization
 * in the UI.
 */
export interface VisDefinition {
    /** The visualization titie (displayed in the selection step). */
    title: string;
    /** The visualization's icon (displayed in the selection step). */
    icon: IconDefinition;
    /** A short description of the visualization */
    description?: string;
    /** The selection object specific to this visualization. */
    selection: any;
    /**
     * The list of steps used to gather user input to tailor the visualization.
     * If the value is a string then it is assumed to be the classname of a `VisSelection`
     * instance and will be given to the `VisualizationSelectionFactory` to reconstitute.
     * @see step_controls/vis-selection.ts
    */
    steps?: VisConfigStep[];
    /** The component that displays the visualization. */
    component?: ComponentType<any>;
}