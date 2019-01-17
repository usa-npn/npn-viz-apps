import { ComponentType } from "@angular/cdk/portal";
import { IconDefinition } from '@fortawesome/pro-light-svg-icons';
import { Subject } from 'rxjs';

export enum StepState {
    ACTIVE = 'active',
    COMPLETE = 'complete',
    AVAILABLE = 'available',
    UNAVAILABLE = 'unavailable',
    ALT = 'alt' // reserved for non-steps, like share
};

/**
 * Base interface for the other components.
 */
export interface VisConfigComponent {
    /** Title to display for the component. */
    title: string;
    /** The corresponding visualization definition */
    definition?: VisDefinition;
    /** The specific step this component is associated with */
    step?: VisConfigStep;
    /** The selection object used as input for the visualization (likely an instance of VisSelection) */
    selection?: any;
}

export interface VisConfigStepComponent extends VisConfigComponent {
    /** Flag that will be set to true when a component is visited (after any invocation of `stepVisit` will not be reset to false). */
    visited?: boolean;
    /** If available invoked when a step is visited */
    stepVisit?: () => void;
    /** If available invoked when a step is left for another */
    stepDepart?: () => void;
    /** Any other properties the control may need to function */
    [prop:string]: any;
}

/**
 * Simple component that displays, in a list, the portions of its
 * selection its corresponding control is responsible for.
 */
export interface StepComponent extends VisConfigStepComponent {
    /** The corresponding control component */
    controlComponent?: ControlComponent;
    /** Idicates a step's current state (likely a getter). */
    state:StepState;
}
/**
 * UI control/s that manipulate a portion of its
 * selection.
 */
export interface ControlComponent extends VisConfigStepComponent {
    /** The corresponding step component */
    stepComponent?: StepComponent;
    /** THe corresponding sub-control if there is one. */
    subControlComponent?: SubControlComponent;
}

/**
 * An optional component that can be nested within the 3rd level nav.
 * This control is bound to a parent `ControlComponent`
 */
export interface SubControlComponent extends VisConfigComponent {
    /** The corresponding control component */
    controlComponent?: ControlComponent;
    /** Component must supply a stream of indications of when to show/hide. */
    visibility:Subject<boolean>;
}

/**
 * Defines a single step in the gathering of user input for a visualization.
 */
export interface VisConfigStep {
    /** The icon to display in the step list. */
    icon: IconDefinition;
    /** The component that displays the selection from its corresponding control component. */
    stepComponent: ComponentType<StepComponent>;
    /** The component that gathers user inpur for the step. */
    controlComponent: ComponentType<ControlComponent>;
    /** Optional sub-component to the control component. */
    subControlComponent?: ComponentType<SubControlComponent>;
    /** Runtime generated. */
    $id?: string;
    /** Used at runtime to hold onto a reference to the actual step component. */
    $stepInstance?: StepComponent;
    /** Used at runtime to hold onto a reference to the actual control component. */
    $controlInstance?: ControlComponent;
    /**  Used at runtime to hold onto a reference tot he actual sub-control component (if there is one). */
    $subControlInstance?: SubControlComponent;
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
    /**
     * A copy of the initial selection object with everything intact as it
     * arrived from the `VisualizationSelectionFactory`.  The keys of this object's
     * `external` representation will be used to delete any defaults to construct
     * the `selection` property value below.  This can be used by steps to
     * re-populate defaults when a step is first visited.
     */
    templateSelection?: any;
    /**
     * The selection object specific to this visualization.
     * When defined initially the value should be the string containing the
     * classname of the `VisSelection` to pass to the `VisualizationSelectionFactory`
     * used to create and populate this field and the `templateSelection` field.
     */
    selection: any;
    /**
     * The list of steps used to gather user input to tailor the visualization.
     * @see step_controls/vis-selection.ts
    */
    steps?: VisConfigStep[];
    /** The component that displays the visualization. */
    component?: ComponentType<any>;
}