import { EventEmitter } from '@angular/core';
import { newGuid, NpnServiceUtils, NetworkService, Station } from '../common';
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
    /**
     * Sub-classes set to true if they support export to POP
     * Must also implement `toPOPInput(input:POPInput = {...BASE_POP_INPUT}):Promise<POPInput>`
     */
    $supportsPop:boolean = false;
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
 * Selections may produce if they support export via the POP.
 * Selections need only supply start/endDate formatted `YYYY-MM-DD` 
 */
export interface POPInput {
    downloadType: string;
    searchSource: string;
    rangeType: string;

    dataPrecision?: number;

    startDate?: string;
    startYear?: number;
    startMonth?: string;
    startDay?: number;

    endDate?: string;
    endYear?: string;
    endMonth?: string;
    endDay?: number;

    species?: number[];
    phenophases?: number[];
    partnerGroups?: number[];
    stations?: number[];
}

export interface SupportsPOPInput {
    toPOPInput(input?:POPInput):Promise<POPInput>;
}

const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
];
/**
 * Takes values for `start|endDate` and fills in the values for
 * `start|endYear|Month|Day`
 * 
 * @param input 
 */
export function completePOPDates(input:POPInput):POPInput {
    const toParts = d => {
        let [year,month,day] = d.split('-').map(p => parseInt(p));
        month = MONTHS[month-1];
        return {year,month,day};
    };
    ['start','end'].forEach(prefix => {
        const date = input[`${prefix}Date`];
        if(date) {
            const parts = toParts(date);
            input[`${prefix}Year`] = parts.year;
            input[`${prefix}Month`] = parts.month;
            input[`${prefix}Day`] = parts.day;
        }
    });
    return input;
}

export const BASE_POP_INPUT:POPInput = {
    downloadType: 'selectable',
    searchSource: 'visualization-tool',
    rangeType: 'Calendar'
};

/**
 * The mode of a given SelectionGroup
 */
export enum SelectionGroupMode {
    /** The group represents the data gathered by a network. */
    NETWORK = "N",
    /** The group represents the data gathered by a single station. */
    STATION = "S",
    /** The group represents the data gathered by stations within a radius of a network (specifically a network with a known boundary). */
    OUTSIDE = "O"
};

/**
 * Represents a selection group when performing visualization comparisons between
 * stations and networks.
 */
export interface SelectionGroup {
    /** The label representing this selection group */
    label: string;
    /** The mode of this selection group. */
    mode: SelectionGroupMode;
    /** The network or station id of this selection group. */
    id?: number;
    /** If mode === NETWORK an optional list of station ids to exclude from the network. */
    excludeIds?: number[];
    /** If mode === OUTSIDE the radius outside of the network to gather stations. */
    outsideRadiusMiles?: number;
}

/**
 * The pairing of a single SelectionGroup with the HttpParams that
 * will be used to fetch its data.
 */
export interface GroupHttpParams {
    group: SelectionGroup;
    params: HttpParams;
}

/**
 * @dynamic
 */
export abstract class NetworkAwareVisSelection extends VisSelection implements SupportsPOPInput {
    @selectionProperty()
    networkIds?: any[] = [];
    @selectionProperty()
    groups?: SelectionGroup[];

    constructor(protected networkService:NetworkService){
        super();
    }

    getStationIds():Promise<number []> {
        return this.networkIds && this.networkIds.length
            ? this.networkService.getStations(this.networkIds)
                .then(stations => stations.map(s => s.station_id))
            : Promise.resolve([]);
    }

    toURLSearchParams(params: HttpParams = new HttpParams()): Promise<HttpParams> {
        // translate any network_ids into station_ids
        return this.getStationIds()
            .then(sids => sids.reduce((params,id,i) => params.set(`station_id[${i}]`, `${id}`),params));
    }
    
    toPOPInput(input:POPInput = {...BASE_POP_INPUT}):Promise<POPInput> {
        input.partnerGroups = this.networkIds && this.networkIds.length
            ? this.networkIds.slice()
            : undefined;
        return Promise.resolve(input);
    }

    /**
     * Removes any station_id[n] parameters from a set of HttpParams.
     * 
     * @param params The params to remove parameters from
     */
    protected resetStationIdParams(params: HttpParams):HttpParams {
        params.keys()
            .filter(key => /^station_id\[\d+\]$/.test(key))
            .forEach(key => params = params.delete(key));
        return params;
    }

    /**
     * Multiplies out a set of HttpParams by the value of the groups property.
     * This function should NOT be called if the groups property is not set or empty (will result in a rejected Promise).
     * 
     * @todo Implement SelectionGroupMode.OUTSIDE support
     * @param params The params to multiply out by groups
     */
    toGroupHttpParams(params: HttpParams = new HttpParams()): Promise<GroupHttpParams[]> {
        if(!this.groups || !this.groups.length) {
            return Promise.reject('selection has no SelectionGroups defined');
        }
        // to be safe clean out any station_id parameters that might have been set
        params = this.resetStationIdParams(params);
        const promises:Promise<GroupHttpParams>[] = this.groups.map(group => {
            switch(group.mode) {
                case SelectionGroupMode.STATION:
                    params = params.set('station_id[0]',`${group.id}`);
                    return Promise.resolve({group,params});
                case SelectionGroupMode.NETWORK:
                    // translate the network to its underlying stations
                    return this.networkService.getStations(group.id)
                        // just need the station_ids
                        .then((stations:Station[]) => stations.map(s => s.station_id))
                        // exclude any stations the group excludes
                        .then((ids:number[]) => ids.filter(id => (group.excludeIds||[]).indexOf(id) === -1))
                        .then((ids:number[]) => {
                            ids.forEach((id,i) => params = params.set(`station_id[${i}]`,`${id}`));
                            return ({group,params})
                        });
                case SelectionGroupMode.OUTSIDE:
                    return Promise.reject('TODO SelectionGroupMode.OUTSIDE not implemented yet');
            }
            return Promise.reject(`Unknown SelectionGroupMode ${group.mode}`);
        });
        return Promise.all(promises);
    }
}

export interface PredefinedBoundarySelection {
    id: number;
    boundaryName: string;
    typeId: number;
    boundaryTypeName: string;
}

export interface PolygonBoundarySelection {
    data: number[][];
}

export type BoundarySelection = PredefinedBoundarySelection | PolygonBoundarySelection;

export function isPredefinedBoundarySelection(o:any):boolean {
    return typeof(o.id) === 'number' &&
        typeof(o.typeId) === 'number' &&
        typeof(o.boundaryName) === 'string' &&
        typeof(o.boundaryTypeName) === 'string';
}

export function isPolygonBoundarySelection(o:any):boolean {
    return Array.isArray(o.data) &&
        o.data.length &&
        Array.isArray(o.data[0]) &&
        o.data[0].length === 2 &&
        typeof(o.data[0][0]) === 'number';
}

/**
 * @dynamic
 */
export abstract class StationAwareVisSelection extends NetworkAwareVisSelection {
    @selectionProperty()
    _personId;
    @selectionProperty()
    _groupId;
    @selectionProperty()
    stationIds?: any[] = [];
    @selectionProperty()
    _boundaries:BoundarySelection[];

    constructor(protected serviceUtils:NpnServiceUtils,protected networkService:NetworkService) {
        super(networkService);
    }

    get personId():any {
        return this._personId;
    }
    set personId(id:any) {
        const orig = this._personId;
        if((this._personId = id) != orig) {
            this.update();
        }
    }

    get groupId():any {
        return this._groupId;
    }

    set groupId(id:any) {
        const orig = this._groupId;
        if((this._groupId = id) != orig) {
            this.update();
        }
    }

    get boundaries():BoundarySelection[] {
        return this._boundaries||[];
    }

    set boundaries(boundaries:BoundarySelection[]) {
        this._boundaries = boundaries;
        this.update();
    }

    protected getStationIdPromises():Promise<number[]>[] {
        const baseParams:any = {};
        if(this.personId) {
            baseParams.person_id = this.personId;
        }
        if(this.groupId) {
            baseParams.group_id = this.groupId;
        }
        const promises = this.boundaries.map(b => {
            if((b as any).data) {
                const polySelection = b as PolygonBoundarySelection;
                const polygon = polySelection.data.slice();
                polygon.push(polySelection.data[0]); // close the loop
                return this.serviceUtils.cachedGet(
                        this.serviceUtils.apiUrl('/npn_portal/stations/getStationsByLocation.json'),
                        {...baseParams,wkt: 'POLYGON(('+polygon.map(pair => `${pair[1]} ${pair[0]}`).join(',')+'))'}
                    )
                    .then(response => response.map(s => s.station_id))
            }
            const predefSelection = b as PredefinedBoundarySelection;
            return this.serviceUtils.cachedGet(
                this.serviceUtils.apiUrl('/npn_portal/stations/getStationsForBoundary.json'),
                {...baseParams,boundary_id:predefSelection.id}
            );
        });
        // If this selection has an explicit list of stationIds then return them and ignore any
        // the parent class might supply by virtue of the value of the networkIds property.
        // It is assumed that if they are set AND the parent has a list of networkIds
        // that the list of stationIds is a subset of stations within the parent's networks
        if(this.stationIds && this.stationIds.length) {
            promises.push(Promise.resolve(this.stationIds.slice()));
        } else {
            promises.push(super.getStationIds());
        }
        return promises;
    }

    getStationIds():Promise<number []> {
        return Promise.all(this.getStationIdPromises())
            .then(results => results.reduce((ids,stationIds) => ids.concat(stationIds),[]))
    }

    toURLSearchParams(params: HttpParams = new HttpParams()): Promise<HttpParams> {
        return super.toURLSearchParams(params)
            .then(params => this.personId ? params.set('person_id',`${this.personId}`) : params)
            .then(params => this.groupId ? params.set('group_id',`${this.groupId}`) : params)
            .then(params => {
                // note: in case the parent's implementation of toURLSearchParams included station_ids parameters we need
                // to unset them and replace them with any this class generates (which may include or exclude those supplied
                // by the parent)
                params = this.resetStationIdParams(params);
                return this.getStationIds().then(results => {
                    results.forEach((id,i) => params = params.set(`station_id[${i}]`, `${id}`));
                    return params;
                })
            });
    }

    toPOPInput(input:POPInput = {...BASE_POP_INPUT}):Promise<POPInput> {
        return super.toPOPInput(input)
            .then(input => Promise.all(this.getStationIdPromises())
                .then(results => {
                    input.stations = results.reduce((ids,stationIds) => ids.concat(stationIds),[]);
                    return input;
                }));
    }
}
