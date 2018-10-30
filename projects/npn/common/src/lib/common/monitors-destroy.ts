import { Subject } from 'rxjs';

/**
 * Simple base class that can be re-used in support of a common pattern where
 * Observable subscriptions may outlast the life of a given component.
 * Extending classes will have a simple Subject, `componentDestroyed` that will
 * emit a single time when the componene is destroyed.
 *
 * This class implenents `ngOnDestroy` so if an extending class over-rides that
 * function it should call the parent implementation or a leak might occur.
 *
 * E.g.
 * ```
 * anObservable.pipe(takeUntil(this.componentDestroyed)).subscribe(...);
 * ```
 */
export class MonitorsDestroy {
    protected componentDestroyed:Subject<any> = new Subject();

    ngOnDestroy() {
        this.componentDestroyed.next();
        this.componentDestroyed.complete();
    }
}
