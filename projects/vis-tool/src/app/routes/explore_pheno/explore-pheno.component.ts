import { Component, ViewChildren, QueryList, ComponentFactoryResolver, ViewContainerRef, ViewChild } from "@angular/core";
import { zip, Subscription } from 'rxjs';
import { takeUntil, map, filter } from 'rxjs/operators';

import {
    faArrowLeft,
    faArrowRight
  } from '@fortawesome/pro-light-svg-icons';

import { VisConfigStep, VisDefinition } from "./interfaces";

import { StepComponent, ControlComponent } from './interfaces';
import { MonitorsDestroy, VisSelection } from "@npn/common";

import { VisSelectionStep, VisSelectionSelection, DummyStep, VisSelectionControlComponent } from "./step_controls";
import { SharingService } from './sharing.service';
import { ActivatedRoute } from '@angular/router';

@Component({
    templateUrl: './explore-pheno.component.html'
})
export class ExplorePhenoComponent extends MonitorsDestroy {
    controlsOpen = true;
    faArrowLeft = faArrowLeft;
    faArrowRight = faArrowRight;

    @ViewChildren('stepHost',{read:ViewContainerRef}) stepHosts:QueryList<ViewContainerRef>;
    @ViewChildren('controlHost',{read:ViewContainerRef}) controlHosts:QueryList<ViewContainerRef>;
    @ViewChild('visualizationHost',{read:ViewContainerRef}) visualizationHost:ViewContainerRef;

    visSelectionSelection:VisSelectionSelection = new VisSelectionSelection();
    activeVis:VisDefinition;
    activeStep:VisConfigStep;
    steps:VisConfigStep[];
    activeVisComponent:any;
    // value never used since unsubscription via takeUntil
    // but exists to know when to generate the subscription
    private sharingSubscription:Subscription;

    constructor(
        private componentFactoryResolver:ComponentFactoryResolver,
        private activedRoute:ActivatedRoute,
        private sharingService:SharingService
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
        }
        this.controlsOpen = true;    
        execVisitFunc(this.activeStep,'stepDepart');
        execVisitFunc((this.activeStep = step),'stepVisit');
        step.$controlInstance.visited = step.$stepInstance.visited = true;
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
        // console.log('visualizationHost',this.visualizationHost);
        // console.log('activeVis',this.activeVis);
        // console.log('stepHosts',stepHosts);
        // console.log('controlHosts',controlHosts);

        delete this.activeStep;
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
            const stepComponent = step.$stepInstance = (<StepComponent>stepRef.instance);
            const controlComponent = step.$controlInstance = (<ControlComponent>controlRef.instance);

            
            stepComponent.definition = controlComponent.definition = this.activeVis;
            stepComponent.step = controlComponent.step = step;
            stepComponent.controlComponent = controlComponent;
            controlComponent.stepComponent = stepComponent;
            
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
        if(!this.sharingSubscription) {
            // this should only happen once but cannot happen until after the steps have been setup
            this.initializeSharingSubscription();
        }
    }

    private initializeSharingSubscription() {
        this.sharingSubscription = this.activedRoute.paramMap
            .pipe(
                map(pm => pm.get('s')),
                filter(s => !!s),
                takeUntil(this.componentDestroyed)
            )
            .subscribe(s => {
                const visSelectionControl = this.steps[0].$controlInstance as VisSelectionControlComponent;
                const selection:VisSelection = this.sharingService.deserialize(s);
                console.log('shared selection',selection);
                visSelectionControl.setVisSelection(selection)
                    // the use of a pause value on this setTimeout does not feel ideal here but the problem is
                    // the VisSelectionSelection is static, as are the list of visualization definitions
                    // but ALL steps are re-initialized when a visualization is selected, including visualization selection,
                    // so the visSelectionControl instance used to populate the selection disppears by virtue of
                    // the above call and then the new one gets re-focused when the list of steps is re-written.
                    // so the setting of controlsOpen has no effect until -after- all that happens and the "new"
                    // step 0 is inserted into the DOM
                    .then(selected => setTimeout(() => {
                            this.controlsOpen = !selected
                            if(selected) {
                                setTimeout(() => this.resize());
                            }
                        },500)); // close control if the set was successful
                
            });
    }
}