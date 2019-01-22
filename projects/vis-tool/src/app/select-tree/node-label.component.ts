import { Component } from '@angular/core';

@Component({
    selector: 'node-label',
    template: `
    <div class="label-wrapper">
        <div class="label">
            <ng-content></ng-content>
        </div>
    </div>
    `
})
export class NodeLabelComponent {}