import { Component, ViewChildren, QueryList, ComponentFactoryResolver, ViewContainerRef, ViewChild } from "@angular/core";
import { Observable, Subject } from 'rxjs';
import { zip, Subscription, merge as mergeObservables } from 'rxjs';
import { takeUntil, map, filter } from 'rxjs/operators';

import {
    faArrowLeft,
    faArrowRight
  } from '@fortawesome/pro-light-svg-icons';

import { VisConfigStep, VisDefinition } from "./interfaces";

import { StepComponent, ControlComponent, SubControlComponent } from './interfaces';
import { MonitorsDestroy, VisSelection, newGuid } from "@npn/common";

import { VisSelectionStep, VisSelectionSelection, DummyStep, VisSelectionControlComponent } from "./step_controls";
import { SharingService } from './sharing.service';
import { ActivatedRoute } from '@angular/router';

const INIT_STEPS = (steps:VisConfigStep[]) => steps.forEach(s => s.$id = (s.$id||newGuid()));
const STEP_ID = (vcr:ViewContainerRef) => (vcr.element.nativeElement.getAttribute('id')||'').replace(/^[^\-]+\-/,'');

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
        this.controlsOpen.next(true);
        execVisitFunc(this.activeStep,'stepDepart');
        execVisitFunc((this.activeStep = step),'stepVisit');
        step.$controlInstance.visited = step.$stepInstance.visited = true;
        setTimeout(() => this.resize(),500);
    }

    ngOnInit() {
        // when main controls state triggered close sub-controls if open
        this.controlsOpen.pipe(takeUntil(this.componentDestroyed))
            .subscribe(() => this.subControlsOpen.next(false));
        this.visSelectionSelection.changes.pipe(takeUntil(this.componentDestroyed))
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
        super.ngOnDestroy();
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
        if(this.activeVisComponent && typeof(this.activeVisComponent.resize) === 'function') {
            this.activeVisComponent.resize();
        }
    }

    private setupSteps(hosts) {
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
            const stepFactory = this.componentFactoryResolver.resolveComponentFactory(step.stepComponent);
            const stepHost = stepHosts[i];
            const controlFactory = this.componentFactoryResolver.resolveComponentFactory(step.controlComponent);
            const controlHost = controlHosts[i];
            const subControlFactory = !!step.subControlComponent
                ? this.componentFactoryResolver.resolveComponentFactory(step.subControlComponent)
                : null;
            const subControlHost = subControlHosts[i];

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
                    .then(selected => setTimeout(() => this.controlsOpen.next(!selected),500)); // close control if the set was successful
                
            });
    }
}