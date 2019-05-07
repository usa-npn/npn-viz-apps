import { Injectable } from '@angular/core';

import * as pako from 'pako';
import { VisSelection, APPLICATION_SETTINGS, AppSettings } from '@npn/common';

export interface Shared {
    external:any;
    description?:string;
    settings?:AppSettings;
}

@Injectable()
export class SharingService {
    /**
     * Serializes a VisSelection to a string.  Current application
     * settings will be included.
     * 
     * @param selection The `VisSelection` to serialized.
     */
    serializeSelection(selection:VisSelection) {
        const external = selection.external;
        const settings = {...APPLICATION_SETTINGS} as AppSettings;
        return this.serialize({external,settings});
    }

    /**
     * Serializes a `Shared` object to a string.
     * 
     * @param shared The `shared` object to serialize.
     */
    serialize(shared:Shared) {
        return this.deflate(JSON.stringify(shared));
    }

    /**
     * Deserializes a previously serialized selection.
     * _Note:_ If the deserialized result contains application settings the application settings will be updated.
     * 
     * @param serialized A serialized string produced by `serialize` or `serializeExternal`.
     */
    deserialize(serialized:string):Shared {
        const o:Shared = JSON.parse(this.inflate(serialized));
        if(o.settings) {
            setTimeout(() => {
                Object.keys(o.settings).forEach(key => {
                    APPLICATION_SETTINGS[key] = o.settings[key];
                });
            });
        }
        return o;
    }

    /**
     * deflates and codes a string.
     * @param inflated The inflated string.
     */
    deflate(inflated:string):string {
        return window.btoa(pako.deflate(inflated,{to:'string'}))
    }

    /**
     * decodes and inflates a string.
     * @param deflated The deflated string.
     */
    inflate(deflated:string):string {
        return pako.inflate(window.atob(deflated), {to: 'string'})
    }
}