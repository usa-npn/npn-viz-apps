import { Injectable } from '@angular/core';

import * as pako from 'pako';
import { VisSelection, VisualizationSelectionFactory } from '@npn/common';

@Injectable()
export class SharingService {
    constructor(private visSelectionFactory:VisualizationSelectionFactory) {}

    serialize(selection:VisSelection) {
        return window.btoa(pako.deflate(JSON.stringify(selection.external),{to:'string'}));
    }
    
    deserialize(serialized:string):VisSelection {
        const external = JSON.parse(pako.inflate(window.atob(serialized), {to: 'string'}));
        return this.visSelectionFactory.newSelection(external);
    }
}