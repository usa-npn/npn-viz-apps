import { Component, ViewChildren, QueryList, ComponentFactoryResolver } from "@angular/core";
import { zip } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
    faMapMarker,
    faChartLine,
    faCalendarAlt
  } from '@fortawesome/pro-light-svg-icons';

import { VisConfigStep } from "./interfaces";

import { StepHost, ControlHost } from "./step-hosts";
import { StepComponent, ControlComponent } from './interfaces';
import { MonitorsDestroy } from "@npn/common";

import { VisSelectionStep, VisSelectionSelection } from "./step_controls";

@Component({
    templateUrl: './explore-pheno.component.html'
})
export class ExplorePhenoComponent extends MonitorsDestroy {
    icons = {faMapMarker,faChartLine,faCalendarAlt};

    @ViewChildren(StepHost) stepHosts:QueryList<StepHost>;
    @ViewChildren(ControlHost) controlHosts:QueryList<ControlHost>;

    visSelectionSelection:VisSelectionSelection = new VisSelectionSelection();
    steps:VisConfigStep[];/* = [
        VisSelectionStep
    ];*/

    constructor(private componentFactoryResolver:ComponentFactoryResolver) {
        super();
    }

    ngOnInit() {
        this.visSelectionSelection.changes.pipe(takeUntil(this.componentDestroyed))
            .subscribe(visDef => console.log('selected visDef',visDef));
    }

    ngAfterViewInit() {
        zip(
            this.stepHosts.changes,
            this.controlHosts.changes
        ).subscribe(hosts => setTimeout(() => this.setupSteps(hosts)));
        setTimeout(() => this.steps = [VisSelectionStep]);
    }

    setupSteps(hosts) {
        const [steps,controls] = hosts;
        const stepHosts:StepHost[] = steps.toArray();
        const controlHosts:ControlHost[] = controls.toArray();
        console.log('stepHosts',stepHosts)
        console.log('controlHosts',controlHosts)
        // parallel arrays not wonderful but want all controls to actually be in the DOM
        // at the same time (not created/recreated as users navigate steps)
        this.steps.forEach((step,i) => {
            const stepFactory = this.componentFactoryResolver.resolveComponentFactory(step.stepComponent);
            const stepHost = stepHosts[i];
            const controlFactory = this.componentFactoryResolver.resolveComponentFactory(step.controlComponent);
            const controlHost = controlHosts[i];

            stepHost.viewContainerRef.clear();
            controlHost.viewContainerRef.clear();

            const stepRef = stepHost.viewContainerRef.createComponent(stepFactory);
            const controlRef = controlHost.viewContainerRef.createComponent(controlFactory);
            // wire the two together
            const stepComponent = (<StepComponent>stepRef.instance);
            const controlComponent = (<ControlComponent>controlRef.instance);

            stepComponent.control = controlComponent;
            controlComponent.step = stepComponent;
            
            if(i === 0) { // step 0 is the selection step
                stepComponent.selection = controlComponent.selection = this.visSelectionSelection;
            } else {
                // TODO get visualization specific selection to build
                stepComponent.selection = controlComponent.selection = {};
            }
        });
    }
}