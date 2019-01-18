import { Input, ElementRef } from '@angular/core';

import { detectIE, MonitorsDestroy } from '../common';
import { VisSelection, VisSelectionEvent, REJECT_INVALID_SELECTION } from './vis-selection';

import { fromEvent } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { MediaChange, ObservableMedia } from "@angular/flex-layout";

export const DEFAULT_MARGINS: VisualizationMargins = { top: 20, right: 30, bottom: 60, left: 40 };
export const FONT_SIZE: number = 14;
export const FONT_SIZE_PX: string = FONT_SIZE + 'px';

/*
IMPORTANT: There is a rather annoying chicken and egg problem with angular
development vs production builds.  This "component" originally took full
advantage of language features and was properly abstract, works great in dev.
Production builds wouldn't allow this.  They'd complain about the component
not being registered, comment out the @Component annotation and dev builds
then fail.

@Component({
  selector: 'visualization-base',
  template: '"abstract" component'
})
*/
export class VisualizationBaseComponent extends MonitorsDestroy {
    @Input()
    selection: VisSelection;
    @Input()
    thumbnail: boolean = false;

    id: string = 'visualization-' + Math.floor(Math.random() * 1000);

    sizing: VisualizationSizing;
    clazz: string = 'visualization ' + this.constructor.name;

    margins: VisualizationMargins = { top: 0, right: 0, left: 0, bottom: 0 };
    mobileMode: boolean = false;

    protected isIE: boolean;

    constructor(protected rootElement: ElementRef, protected media: ObservableMedia) {
        super();
        this.media.asObservable().pipe(takeUntil(this.componentDestroyed))
            .subscribe((mediaChange: MediaChange) => this.mobileMode = mediaChange.mqAlias === 'xs' || mediaChange.mqAlias === 'sm');
        this.isIE = !!detectIE();
    }

    /**
     * Calculates the dimensions (width based) that the visualization should
     * be drawn to fit properly within the parent element.
     */
    getSizeInfo(minWidth?: number): VisualizationSizing {
        let native = this.rootElement.nativeElement as HTMLElement,
            parent = native.parentElement as HTMLElement,
            ratioMult = 0.5376, // ratio based on initial w/h of 930/500
            strToPx = s => parseInt(s.replace(/px$/, '')),
            style = getComputedStyle(parent, null),
            minusLeft = strToPx(style.paddingLeft) + strToPx(style.borderLeftWidth),
            minusRight = strToPx(style.paddingRight) + strToPx(style.borderRightWidth),
            innerWidth = parent.clientWidth - minusLeft - minusRight,
            margin = this.margins,
            cw = Math.floor(innerWidth),
            scaledWidth = cw;
        if (minWidth && cw < minWidth) {
            cw = minWidth;
        }
        let ch = Math.floor(cw * ratioMult),
            w = cw - margin.left - margin.right,
            h = ch - margin.top - margin.bottom;
        if (isNaN(w)) {
            w = 0;
        }
        if (isNaN(h)) {
            h = 0;
        }
        return (this.sizing = { scaledWidth: scaledWidth, width: w, height: h, margin: margin });
    }

    /**
     * `reset` is intended to initialize a visualziation to it's known "clean" state
     * placing all common elements, etc.  Subclasses will almost certainly over-ride
     * this implementation and call it to get the ball rolling.
     *
     * No asynchronous work should be done here, fetching data, etc. should happen
     * only within `update`.
     */
    protected reset(): void { throw new Error('abstract'); }

    /**
     * Called when the visualization should be redrawn from data already in hand
     * using the current state of the selection.
     */
    protected redraw(): void { throw new Error('abstract'); }

    /**
     * Called when the visualization should go get new clean data, based on its
     * selection, and reset/redraw itself.
     */
    protected update(): void { throw new Error('abstract'); }

    /**
     * Called when the visualization should resize itself.
     */
    protected resize(): void { throw new Error('abstract'); }

    ngAfterViewInit() {
        console.debug('visualization.ngAfterViewInit');
        // redraw and update the visualization on window re-size, debounce
        // to avoid rapid redraws as the window is resized
        // NOTE: there may be some stupid issue with IE11 and the window
        // resize event.  Could perhaps use the @HostListener route below but
        // that should then implement its own debounce (via setTimeout)
        // and they seem to want to push the use of RxJs so this kind of thing
        // feels cleaner.
        fromEvent(window, 'resize').pipe(debounceTime(500),takeUntil(this.componentDestroyed))
            .subscribe(() => this.resize());

        // now that we're prepared to start listening to our selection for
        // VisSelectionEvents.
        this.selection
            .pipe(takeUntil(this.componentDestroyed))
            .subscribe((event) => {
                switch (event) {
                    case VisSelectionEvent.RESET:
                        return this.reset();
                    case VisSelectionEvent.REDRAW:
                        return this.redraw();
                    case VisSelectionEvent.UPDATE:
                        return this.update();
                    case VisSelectionEvent.RESIZE:
                        return this.resize();
                }
            });
    }

    /* a way of capturing window events...
    @HostListener('window:resize',['$event'])
    onResize(event) {
        this.redraw();
    }*/

    protected handleError(e?: any): void {
        if (e && e !== REJECT_INVALID_SELECTION) {
            console.error(e);
        }
    }
}

export class VisualizationMargins {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
}

export class VisualizationSizing {
    scaledWidth?: number;
    width: number;
    height: number;
    margin: VisualizationMargins;
}
