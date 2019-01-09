import { Directive, ViewContainerRef, Component, Input, ComponentFactoryResolver } from '@angular/core';
import { VisConfigStep } from './interfaces';

@Directive({
  selector: '[step-host]',
})
export class StepHost {
  constructor(public viewContainerRef: ViewContainerRef) { }
}

/*
@Component({
    selector: 'step-container',
    template: '<ng-template step-host></ng-template>'
})
export class StepContainer {
    @Input() step: VisConfigStep;

    constructor(private componentFactorResolver:ComponentFactoryResolver) {}

    ngOnInit() {
        const componentFactory = this.componentFactorResolver.resolveComponentFactory(this.step.stepComponent);
    }
}
*/

@Directive({
    selector: '[control-host]',
})
export class ControlHost {
    constructor(public viewContainerRef: ViewContainerRef) { }
}