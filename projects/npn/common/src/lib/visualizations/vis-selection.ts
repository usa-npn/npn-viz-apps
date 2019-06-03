import { EventEmitter } from '@angular/core';
import { newGuid, NpnServiceUtils } from '../common';
import { HttpParams } from '@angular/common/http';

export const NULL_DATA = -9999;
export const ONE_DAY_MILLIS: number = (24 * 60 * 60 * 1000);

export const enum VisSelectionEvent {
    RESET = 'reset', // go back to a "clean" slate
    REDRAW = 'redraw', // assuming you have data simply re-draw with that data
    UPDATE = 'update', // go get new data and reset/redraw
    RESIZE = 'resize', // short cut for reset/redraw
}

/*
 * A VisSelection is a jumble of properties and methods, not all of which should be serialized
 * and deserialized when [re]storing a selection to/from JSON.  In standard JavaScript this
 * could probably be dealt with cleanly via Object.defineProperty (and a big constructor) but
 * with TypeScript it's significantly more complicated.  For this reason all properties that
 * are part of what should be serialized for a given selection MUST be annotated with @selectionProperty()
 *
 * The virtual `external` property on a selection will produce a plain object representation
 * for a selection.  Assigning an object to the `external` property will deserialize it onto
 * the selection object.
 *
 * IMPORTANT: If a property key is prefixed with `_` it is assumed, by convention, that is the
 * internal representation of a virtual property of the same name without the leading `_`.
 * Such properties will be serialized without the leading `_` and when deserialized will be set
 * directly without the leading `_` so that any logic defined in the corresponding property setter
 * is run.
 */
import 'reflect-metadata';
const selectionPropertyMetadataKey = Symbol('npnSelectionProperty');
const IDENTITY = d => d;
/**
 * Defines a property handler for a selection property.
 */
export class SelectionPropertyHandler {
    /**
     * A function that is used to serialize a property object.
     * Takes as input an object and returns an object.
     * Defaults to object identity.
     */
    ser?: Function;
    /**
     * A function that is used to serialize a property object.
     * Takes as input an object and returns an object.
     * Defaults to object identity.
     */
    des?: Function;
}
/**
 * Property decorator to indicate which properties of a selection should
 * be part of the external form of the selection.
 * E.g.
 * <pre>
 *   @selectionProperty()
 *   private s:string;
 *   @selectionProperty({des: d => new Date(d)})
 *   private date:Date;
 *   @selectionProperty({
 *     des: d => {
 *       let o = new MyClass();
 *       ... copy properties for d to o ...
 *       return o;
 *     },
 *     ser: d => d
 *   })
 *   private o:MyClass;
 * </pre>
 */
export const selectionProperty = (handler?: SelectionPropertyHandler) => {
    let the_handler = {
        ...{ des: IDENTITY, ser: IDENTITY },
        ...(handler || {})
    };
    return Reflect.metadata(selectionPropertyMetadataKey, the_handler);
};
const isSelectionProperty = (target: any, propertyKey: string) => {
    let meta = Reflect.getMetadata(selectionPropertyMetadataKey, target, propertyKey);
    if (!meta) {
        meta = Reflect.getMetadata(selectionPropertyMetadataKey, target, `_${propertyKey}`);
    }
    return meta;
};
// these are exported functions so that other classes can use similar
// s11n/des11n functionality.
export function GET_EXTERNAL() {
    let ext = {
        // see comment below on $class property
        //$class: this.constructor.name
    };
    Object.keys(this).forEach(key => {
        let handler = isSelectionProperty(this, key);
        if (handler) {
            let v = this[key];
            if (/^_/.test(key)) {
                key = key.substring(1);
            }
            if (Array.isArray(v)) {
                ext[key] = v.map(d => handler.ser(d));
            } else {
                ext[key] = handler.ser(v);
            }
        }
    });
    return ext;
};
export function SET_EXTERNAL(o) {
    Object.keys(o).forEach(key => {
        let handler = isSelectionProperty(this, key);
        if (handler) {
            let v = o[key];
            if (typeof (v) !== 'undefined') {
                if (Array.isArray(v)) {
                    this[key] = v.map(d => handler.des(d));
                } else {
                    this[key] = handler.des(v);
                }
            } else {
                this[key] = undefined;
            }
        }
    });
};

export const REJECT_INVALID_SELECTION = 'invalid selection';

/**
 * Base class for visualization selection (user input).  A VisSelection is attached
 * to a specific visualization and the selection itself sends events to the visualization
 * to tell it when meaningful changes have happened and it should reset/redraw or update.
 *
 * The utility methods reset/redraw/update send instructions to the visualization.  These
 * functions can be called at any time, even before the selection has been wired to its
 * visualization.  Events will be held onto and delivered if/when the visualization has
 * subscribed.
 *
 * Note: EventEmitter does not have an unsubscribe (though it, today, extends RxJs Subject)
 * so technically does.  Should perhaps consider not extending Angular's EventEmitter
 * 
 * Note: Within the current set of visualizations there are two distinct ways that events
 * are triggered.  Earlier visualizations would have controls populate values on a selection
 * and then based on knowledge about how the visualization worked the controls themselves
 * would call update or redraw.  This meant that controls contained more logic and more
 * internal knowledge about how a specific visualization functions (which properties might
 * just alter the appearance of a visualization, redraw, versus what type of change might
 * require the visualization to go back to the server to get new data).  Newer visualization
 * implementations move that knowledge into the selection via the use of setters/getters
 * which can simplify controls many times simply allowing them to use two-way data binding
 * between a control and the selection itself.  The `pause`/`resume` functionality was added
 * to help with these types of implementations when special cases arise to avoid any attached
 * visualization components from doing work (e.g. population of defaults or cooperating
 * selection properties)
 * 
 * @todo review use of `editMode` flag to see if it can be removed (maybe using `pause`/`resume` instead).
 * 
 * @dynamic
 */
export abstract class VisSelection extends EventEmitter<VisSelectionEvent> {
    /*
    Note: Previously this.class.name was used when serializing a selection to JSON.
    This does not work in production mode because of JavaScript minification.
    So instead making this explicit.  All concrete VisSelection classes need to
    add the $class @selectionProperty() and put their class name within it.
     */
    @selectionProperty()
    $class: string = 'VisSelection';
    @selectionProperty()
    guid: string = newGuid();
    @selectionProperty()
    meta: any = {}; // a place for non selection specific info to be held
    debug: boolean = false;
    working: boolean = false;
    // this flag is not persisted but can be used by a visualization if it
    // would like to have a control pick "default state" while the visualization
    // is being built.
    editMode: boolean = false;
    updateSent: boolean = false;
    private _paused:boolean = false;
    [x: string]: any;

    readonly INVALID_SELECTION = REJECT_INVALID_SELECTION;

    private lastEmit: any = {};
    private firstSubscriberResolver: any;
    private firstSubscriber: Promise<any> = new Promise<any>((resolve) => {
        this.firstSubscriberResolver = resolve;
    });

    get external() { return GET_EXTERNAL.apply(this, arguments); }
    set external(o) {
        this.pause();
        try {
            SET_EXTERNAL.apply(this, arguments);
        } finally {
            this.resume();
        }
    }

    /** @returns {boolean} true if events are paused. */
    isPaused():boolean { return this._paused; }
    /** Pauses even propagation so update/redraw, etc. will have no effect until resumed. */
    pause() { this._paused = true; }
    /** Resumes event propagation. */
    resume() { this._paused = false; }

    /**
     * Instruct the visualization to go back to a "clean" slate
     */
    reset(): void {
        this.emit(VisSelectionEvent.RESET);
    }

    /**
     * Instruct the visualization to redraw itself using the data it already
     * has and the current state of the selection.
     * Will do nothing if the selection is not valid.
     * If an update has not been sent yet then redraw will cause an update.
     */
    redraw(): void {
        if(this.isValid()) {
            if(!this.updateSent) {
                this.update();
            } else {
                this.emit(VisSelectionEvent.REDRAW);
            }
        }
    }

    /**
     * Instruct the visualization to go get new data and reset/redraw itself.
     * Will do nothing if the selection is not valid.
     */
    update(): void {
        if(this.isValid()) {
            this.emit(VisSelectionEvent.UPDATE);
        }
    }

    /**
     * Instruct the visualization to resize itself.
     */
    resize(): void {
        this.emit(VisSelectionEvent.RESIZE);
    }

    abstract isValid(): boolean;

    protected handleError(e?: any): void {
        console.error(e);
        this.working = false;
    }

    // make sure no events go out until there is at least one subscriber to receive them.
    emit(value?: VisSelectionEvent) {
        if(this._paused) {
            return;
        }
        var self = this,
            emitArgs = arguments,
            thisEmit: any = {
                value: value,
                when: Date.now(),
                ext: JSON.stringify(this.external)
            };
        // throttle events on emit rather than requiring subscribers to do this.
        // i.e. if the event being emitted differs from the last event emitted it
        // always gets through.  events get pruned out if they are not distinct
        // and happen within the specific interval
        // e.g.
        // selection.update(); selection.update(); selection.update();
        // only the first will get through
        // but selection.update() setTimeout(() => selection.update(),600);
        // both will get through
        if (this.lastEmit.value !== thisEmit.value || this.lastEmit.ext !== thisEmit.ext || this.lastEmit.when < (thisEmit.when - 500)) {
            this.lastEmit = thisEmit;
            console.log('letting event through', thisEmit/*, new Error(`${thisEmit.value}: stack trace`)*/);
            this.firstSubscriber.then(() => {
                super.emit.apply(self, emitArgs);
                if(thisEmit.value === VisSelectionEvent.UPDATE) {
                    this.updateSent = true;
                }
            });
        } else {
            console.log('pruned out redundant event', thisEmit);
        }
    }

    subscribe(generatorOrNext?: any, error?: any, complete?: any): any {
        // resolve the above promise..
        this.firstSubscriberResolver();
        return super.subscribe.apply(this, arguments);
    }
}

/**
 * @dynamic
 */
export abstract class NetworkAwareVisSelection extends VisSelection {
    @selectionProperty()
    networkIds?: any[] = [];

    toURLSearchParams(params: HttpParams = new HttpParams()): Promise<HttpParams> {
        (this.networkIds || []).forEach((id, i) => params = params.set(`network_id[${i}]`, `${id}`));
        return Promise.resolve(params);
    }
}

/**
 * @dynamic
 */
export abstract class StationAwareVisSelection extends NetworkAwareVisSelection {
    @selectionProperty()
    stationIds?: any[] = [];
    @selectionProperty()
    boundaryTypeId?:number;
    @selectionProperty()
    _boundaryId?:number;
    @selectionProperty()
    _polygons:number[][][];

    constructor(protected serviceUtils:NpnServiceUtils) {
        super();
    }

    set boundaryId(bid:number) {
        this._boundaryId = bid;
        this.update();
    }

    get boundaryId():number {
        return this._boundaryId;
    }

    get polygonBoundaries():number[][][] {
        return this._polygons||[];
    }

    set polygonBoundaries(polygons:number[][][]) {
        this._polygons = polygons;
        this.update();
    }

    toURLSearchParams(params: HttpParams = new HttpParams()): Promise<HttpParams> {
        return super.toURLSearchParams(params)
            .then(params => {
                const stationIdPromises:Promise<any>[] = [];
                if(typeof(this.boundaryId) === 'number') {
                    stationIdPromises.push(this.serviceUtils.cachedGet(
                        this.serviceUtils.apiUrl('/npn_portal/stations/getStationsForBoundary.json'),
                        {boundary_id:this.boundaryId}
                    ));
                }
                this.polygonBoundaries
                    .map(polygon => {
                        // close the polygon
                        const copy = polygon.slice();
                        copy.push(polygon[0]);
                        return copy;
                    })
                    .forEach(polygon => stationIdPromises.push(this.serviceUtils.cachedGet(
                        this.serviceUtils.apiUrl('/npn_portal/stations/getStationsByLocation.json'),
                        {wkt: 'POLYGON(('+polygon.map(pair => `${pair[1]} ${pair[0]}`).join(',')+'))'}
                    ).then(response => response.stations.map(s => s.station_id))));
                if(stationIdPromises.length) {
                    return Promise.all(stationIdPromises)
                        .then(results => {
                            results.reduce((ids,stationIds) => ids.concat(stationIds),(this.stationIds||[]).slice())
                                   .forEach((id,i) => params = params.set(`station_id[${i}]`, `${id}`));
                            return params
                        });
                }
                (this.stationIds || []).forEach((id, i) => params = params.set(`station_id[${i}]`, `${id}`));
                return params;
            });
    }
}
