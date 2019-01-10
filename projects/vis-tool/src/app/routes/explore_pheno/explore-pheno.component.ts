import { Component, ViewChildren, QueryList, ComponentFactoryResolver, ViewContainerRef, ViewChild } from "@angular/core";
import { zip } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
    faArrowLeft
  } from '@fortawesome/pro-light-svg-icons';

import { VisConfigStep, VisDefinition } from "./interfaces";

import { StepComponent, ControlComponent } from './interfaces';
import { MonitorsDestroy } from "@npn/common";

import { VisSelectionStep, VisSelectionSelection, DummyStep } from "./step_controls";

@Component({
    templateUrl: './explore-pheno.component.html'
})
export class ExplorePhenoComponent extends MonitorsDestroy {
    controlsOpen = true;
    faArrowLeft = faArrowLeft;

    @ViewChildren('stepHost',{read:ViewContainerRef}) stepHosts:QueryList<ViewContainerRef>;
    @ViewChildren('controlHost',{read:ViewContainerRef}) controlHosts:QueryList<ViewContainerRef>;
    @ViewChild('visualizationHost',{read:ViewContainerRef}) visualizationHost:ViewContainerRef;

    visSelectionSelection:VisSelectionSelection = new VisSelectionSelection();
    activeVis:VisDefinition;
    activeStep:VisConfigStep;
    steps:VisConfigStep[];
    activeVisComponent: any;

    constructor(private componentFactoryResolver:ComponentFactoryResolver) {
        super();
    }

    focusStep(step:VisConfigStep) {
        this.controlsOpen = true;
        this.activeStep = step;
    }

    ngOnInit() {
        this.visSelectionSelection.changes.pipe(takeUntil(this.componentDestroyed))
            .subscribe(visDef => {
                this.activeVis = visDef;
                this.steps.splice(1,this.steps.length-1);
                if(visDef.steps && visDef.steps.length) {
                    const args:any[] = [1,0].concat(visDef.steps as any[]);
                    this.steps.splice.apply(this.steps,args);
                }
            });
    }

    ngAfterViewInit() {
        zip(
            this.stepHosts.changes,
            this.controlHosts.changes
        ).subscribe(hosts => setTimeout(() => this.setupSteps(hosts)));
        setTimeout(() => this.steps = [VisSelectionStep,DummyStep,DummyStep,DummyStep,DummyStep]);
    }

    closeControls() {
        this.controlsOpen = false;
        setTimeout(() => this.resize()); // feels like a workaround
    }

    resize() {
        if(this.activeVisComponent && typeof(this.activeVisComponent.resize) === 'function') {
            this.activeVisComponent.resize();
        }
    }

    private setupSteps(hosts) {
        const [steps,controls] = hosts;
        const stepHosts:ViewContainerRef[] = steps.toArray();
        const controlHosts:ViewContainerRef[] = controls.toArray();
        console.log('visualizationHost',this.visualizationHost);
        console.log('activeVis',this.activeVis);
        console.log('stepHosts',stepHosts)
        console.log('controlHosts',controlHosts)

        delete this.activeVisComponent;
        if(this.visualizationHost) {
            this.visualizationHost.clear();
        }
        // parallel arrays not wonderful but want all controls to actually be in the DOM
        // at the same time (not created/recreated as users navigate steps)
        this.steps.forEach((step,i) => {
            const stepFactory = this.componentFactoryResolver.resolveComponentFactory(step.stepComponent);
            const stepHost = stepHosts[i];
            const controlFactory = this.componentFactoryResolver.resolveComponentFactory(step.controlComponent);
            const controlHost = controlHosts[i];

            stepHost.clear();
            controlHost.clear();

            const stepRef = stepHost.createComponent(stepFactory);
            const controlRef = controlHost.createComponent(controlFactory);
            // wire the two together
            const stepComponent = (<StepComponent>stepRef.instance);
            const controlComponent = (<ControlComponent>controlRef.instance);

            stepComponent.control = controlComponent;
            controlComponent.step = stepComponent;
            
            stepComponent.selection = (i === 0)
                ? controlComponent.selection = this.visSelectionSelection // 0 always vis selection
                : controlComponent.selection = 
                    // check only necessary because initial setup uses dummy selections with no activeVis in place.
                    this.activeVis ? this.activeVis.selection : null; 
        });
        this.focusStep(this.steps[0]);
        if(this.visualizationHost && this.activeVis && this.activeVis.component) {
            // create and insert the visualization
            const visFactory = this.componentFactoryResolver.resolveComponentFactory(this.activeVis.component);
            const visRef = this.visualizationHost.createComponent(visFactory);
            const visComponent = (<any>visRef.instance);
            visComponent.selection = this.activeVis.selection;
            this.activeVisComponent = visComponent;
            setTimeout(() => this.resize());
        }
    }
}