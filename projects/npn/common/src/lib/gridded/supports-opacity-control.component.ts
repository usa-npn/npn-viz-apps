import {Component,Input,OnChanges,SimpleChanges} from '@angular/core';

// NOTE: these functions are already defined on google.maps.ImageMapType
// re-using the function names and can later just claim that ImageMapType
// implements this interface
export interface SupportsOpacity {
    setOpacity(o:number);
    getOpacity():number;
}

@Component({
    selector: 'supports-opacity-control',
    template:`
    <label>Opacity
        <mat-slider min="0" max="100" step="1" tickInterval="25" [thumbLabel]="opacity" [(ngModel)]="opacity" (change)="opacityChanged()" [disabled]="!supportsOpacity"></mat-slider>
    </label>
    `
})
export class SupportsOpacityControl implements OnChanges {
    @Input()
    supportsOpacity:SupportsOpacity;
    opacity:number = 100;

    opacityChanged() {
        if(this.supportsOpacity) {
            this.supportsOpacity.setOpacity(this.opacity/100.0);
        }
    }

    ngOnChanges(changes:SimpleChanges):void {
        console.log('SupportsOpacityControl.ngOnchanges',changes);
        if(changes.supportsOpacity && changes.supportsOpacity.currentValue) {
            this.opacity = Math.round(changes.supportsOpacity.currentValue.getOpacity()*100);
        }
    }
}
