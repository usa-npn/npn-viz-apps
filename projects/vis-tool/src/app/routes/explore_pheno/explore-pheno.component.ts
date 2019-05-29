import { Component, ViewChildren, QueryList, ComponentFactoryResolver, ViewContainerRef, ViewChild } from "@angular/core";
import { Observable, Subject } from 'rxjs';
import { zip, merge as mergeObservables } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
    faArrowLeft,
    faArrowRight
} from '@fortawesome/pro-light-svg-icons';

import { VisConfigStep, VisDefinition } from "./interfaces";

import { StepComponent, ControlComponent, SubControlComponent } from './interfaces';
import { MonitorsDestroy, newGuid, VisualizationSelectionFactory } from "@npn/common";

import { VisSelectionStep, VisSelectionSelection, DummyStep, resetVisDefinition } from "./step_controls";

const INIT_STEPS = (steps:VisConfigStep[]) => steps.forEach(s => s.$id = (s.$id||newGuid()));

@Component({
    templateUrl: './explore-pheno.component.html'
})
export class ExplorePhenoComponent extends MonitorsDestroy {
    controlsOpen:Subject<boolean> = new Subject();
    subControlsOpen:Subject<boolean> = new Subject();
    subControlsOpen$:Observable<boolean>;
    faArrowLeft = faArrowLeft;
    faArrowRight = faArrowRight;

    @ViewChildren('stepHost',{read:ViewContainerRef}) stepHosts:QueryList<ViewContainerRef>;
    @ViewChildren('controlHost',{read:ViewContainerRef}) controlHosts:QueryList<ViewContainerRef>;
    @ViewChildren('subControlHost',{read:ViewContainerRef}) subControlHosts:QueryList<ViewContainerRef>;
    @ViewChild('visualizationHost',{read:ViewContainerRef}) visualizationHost:ViewContainerRef;

    visSelectionSelection:VisSelectionSelection = new VisSelectionSelection();
    activeVis:VisDefinition;
    activeStep:VisConfigStep;
    steps:VisConfigStep[];
    activeVisComponent:any;

    constructor(
        private componentFactoryResolver:ComponentFactoryResolver,
        private selectionFactory:VisualizationSelectionFactory
    ) {
        super();
    }

    focusStep(step:VisConfigStep) {
        console.log('focusStep',step);
        const execVisitFunc = (s,funcName) => {
            if(s) {
                [s.$stepInstance,s.$controlInstance].forEach(instance => {
                    if(typeof(instance[funcName]) === 'function') {
                        instance[funcName]();
                    }
                });
            }
        };
        execVisitFunc(this.activeStep,'stepDepart');
        execVisitFunc((this.activeStep = step),'stepVisit');
        step.$controlInstance.visited = step.$stepInstance.visited = true;  
        if(this.steps.indexOf(step) === 0) {
            // flag set if the selection control populated this selection from sharing URL args
            // if that was the case then close the controls, o/w open them
            this.controlsOpen.next(!this.visSelectionSelection.changeDueToSharing);
            this.visSelectionSelection.changeDueToSharing = false;
        } else {
            this.controlsOpen.next(true);
        }
        setTimeout(() => this.resize(),500);
    }

    ngOnInit() {
        // when main controls state triggered close sub-controls if open
        this.controlsOpen
            .pipe(takeUntil(this.componentDestroyed))
            .subscribe(() => this.subControlsOpen.next(false));
        // when the selected visualization changes update steps 1-n with those
        // for the selected visualization always leaving  step 0 alone.
        this.visSelectionSelection.changes
            .pipe(takeUntil(this.componentDestroyed))
            .subscribe(visDef => {
                this.activeVis = visDef;
                this.steps.splice(1,this.steps.length-1);
                if(visDef.steps && visDef.steps.length) {
                    const args:any[] = [1,0].concat(visDef.steps as any[]);
                    this.steps.splice.apply(this.steps,args);
                }
                INIT_STEPS(this.steps);
            });
    }

    ngOnDestroy() {
        super.ngOnDestroy(); // cleanup componentDestroyed
        this.subControlsOpen.complete();
    }

    ngAfterViewInit() {
        zip(
            this.stepHosts.changes,
            this.controlHosts.changes,
            this.subControlHosts.changes
        ).subscribe(hosts => setTimeout(() => this.setupSteps(hosts)));
        setTimeout(() => INIT_STEPS(this.steps = [VisSelectionStep,DummyStep,DummyStep,DummyStep,DummyStep]));
    }

    resize() {
        if(this.activeVis) {
            this.activeVis.selection.resize();
        }
    }

    currentHosts;
    reset() {
        resetVisDefinition(this.activeVis,this.selectionFactory);
        this.setupSteps(this.currentHosts);
    }

    private setupSteps(hosts) {
        this.currentHosts = hosts;
        const [steps,controls,subs] = hosts;
        const stepHosts:ViewContainerRef[] = steps.toArray();
        const controlHosts:ViewContainerRef[] = controls.toArray();
        const subControlHosts:ViewContainerRef[] = subs.toArray();
        // console.log('visualizationHost',this.visualizationHost);
        // console.log('activeVis',this.activeVis);
        // console.log('stepHosts',stepHosts);
        // console.log('controlHosts',controlHosts);
        // console.log('subControlHosts',subControlHosts);

        delete this.activeStep;
        delete this.activeVisComponent;
        if(this.visualizationHost) {
            this.visualizationHost.clear();
        }
        const subControlsVisibilitySubjects:Subject<boolean>[] = [this.subControlsOpen];
        // parallel arrays not wonderful but want all controls to actually be in the DOM
        // at the same time (not created/recreated as users navigate steps)
        this.steps.forEach((step,i) => {
            const stepHost = stepHosts[i];
            const controlHost = controlHosts[i];
            const subControlHost = subControlHosts[i];
            if(i === 0 && stepHost.length) {
                // step 0 is the visualization selection step, only initialize it once
                // do not recreate the components over and over.
                return;
            }
            const stepFactory = this.componentFactoryResolver.resolveComponentFactory(step.stepComponent);
            const controlFactory = this.componentFactoryResolver.resolveComponentFactory(step.controlComponent);
            const subControlFactory = !!step.subControlComponent
                ? this.componentFactoryResolver.resolveComponentFactory(step.subControlComponent)
                : null;

            stepHost.clear();
            controlHost.clear();
            subControlHost.clear();

            const stepRef = stepHost.createComponent(stepFactory);
            const controlRef = controlHost.createComponent(controlFactory);
            // wire the two together
            const stepComponent = step.$stepInstance = (<StepComponent>stepRef.instance);
            const controlComponent = step.$controlInstance = (<ControlComponent>controlRef.instance);

            const subControlRef = subControlFactory
                ? subControlHost.createComponent(subControlFactory)
                : null;
            const subControlComponent = step.$subControlInstance = subControlRef
                ? (<SubControlComponent>subControlRef.instance)
                : null;
            if(subControlComponent) {
                subControlsVisibilitySubjects.push(subControlComponent.visibility);
            }

            const subCompRef:any = subControlComponent||{};
            stepComponent.definition = controlComponent.definition = subCompRef.definition = this.activeVis;
            stepComponent.step = controlComponent.step = subCompRef.step = step;
            stepComponent.controlComponent = controlComponent;
            controlComponent.stepComponent = stepComponent;
            controlComponent.subControlComponent = subControlComponent;
            subCompRef.controlComponent = controlComponent;
            
            stepComponent.selection = subCompRef.selection = controlComponent.selection = (i === 0)
                ? this.visSelectionSelection // 0 always vis selection
                : this.activeVis ? this.activeVis.selection : null; // check only necessary because initial setup uses dummy selections with no activeVis in place.
        });
        this.subControlsOpen$ = mergeObservables.apply(null,subControlsVisibilitySubjects);
        this.focusStep(this.steps[0]);
        if(this.visualizationHost && this.activeVis && this.activeVis.component) {
            // pause selection so as components get wired together any updates/resizes are ignored.
            this.activeVis.selection.pause();
            // create and insert the visualization
            const visFactory = this.componentFactoryResolver.resolveComponentFactory(this.activeVis.component);
            const visRef = this.visualizationHost.createComponent(visFactory);
            const visComponent = (<any>visRef.instance);
            visComponent.selection = this.activeVis.selection;
            this.activeVisComponent = visComponent;
            setTimeout(() => {
                // resume and kick visualization
                this.activeVis.selection.resume();
                this.activeVis.selection.update();
            },750);
        }
    }
}