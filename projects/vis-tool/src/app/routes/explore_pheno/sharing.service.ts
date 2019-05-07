import { Injectable } from '@angular/core';

import * as pako from 'pako';
import { VisSelection, VisualizationSelectionFactory, APPLICATION_SETTINGS } from '@npn/common';

interface Shared {
    external: any;
    settings?:  any;
}

@Injectable()
export class SharingService {
    constructor(private visSelectionFactory:VisualizationSelectionFactory) {}

    /**
     * Serializes a VisSelection to a string.
     * 
     * @param selection The `VisSelection` to serialized.
     * @param includeSettings Wether or not the result should contain the current application settings.
     */
    serialize(selection:VisSelection,includeSettings:boolean = false) {
        return this.serializeExternal(selection.external,includeSettings);
    }

    /**
     * Serializes a VisSelection to a string (starting with its external form).
     * 
     * @param external The external form of a `VisSelection`
     * @param includeSettings Whether or not the result should contain the current application settings.
     */
    serializeExternal(external:any,includeSettings:boolean = false) {
        const o:Shared = {
            external: external
        };
        if(includeSettings) {
            o.settings = {...APPLICATION_SETTINGS};
        }
        return window.btoa(pako.deflate(JSON.stringify(o),{to:'string'}));
    }
    
    /**
     * Deserializes a previously serialized selection.
     * _Note:_ If the deserialized result contains application settings the application settings will be updated.
     * 
     * @param serialized A serialized string produced by `serialize` or `serializeExternal`.
     */
    deserialize(serialized:string):VisSelection {
        const o:Shared = JSON.parse(pako.inflate(window.atob(serialized), {to: 'string'}));
        Object.keys(o.settings||{}).forEach(key => {
            APPLICATION_SETTINGS[key] = o.settings[key];
        });
        return this.visSelectionFactory.newSelection(o.external);
    }
}