import { Component } from '@angular/core';
import { faTimes, faArrowLeft } from '@fortawesome/pro-light-svg-icons';

@Component({
    template: `
    <div class="dev-container-wrapper">
        <div>
            <ul class="select-tree">
                <li><node-label>No Layer</node-label>
                    <ul class="level-1">
                        <li class="leaf selected">
                            <node-label>No layer needed (default)</node-label>
                        </li>
                    </ul>
                </li>
                <li><node-label>Spring indices</node-label>
                    <ul class="level-1">
                        <li><node-label>Current year</node-label>
                            <ul class="level-2">
                                <li><node-label (click)="firstLeafCollapsed = !firstLeafCollapsed">First leaf</node-label>
                                    <ul class="level-3"  [ngClass]="{collapsed:firstLeafCollapsed}">
                                        <li class="leaf" *ngFor="let fl of firstLeafs" [ngClass]="{selected:fl.selected}">
                                            <node-label (click)="fl.selected = !fl.selected">{{fl.label}}</node-label>
                                        </li>
                                    </ul>
                                </li>
                            </ul>
                        </li>
                        <li><node-label>First bloom</node-label></li>
                    </ul>
                </li>
            </ul>
            <div class="note mat-caption">Note: only the "First leaf" sub-tree is interactive.</div>
        </div>
        <div>
            <ul class="select-tree">
                <li *ngFor="let sp of species">
                    <node-label (click)="sp.collapsed = !sp.collapsed">{{sp.label}} <span class="normal">({{sp.sub}})</span></node-label>
                    <ul class="level-1" [ngClass]="{collapsed:sp.collapsed}">
                        <li *ngFor="let ph of sp.phenos" class="leaf" [ngClass]="{selected:ph.selected}">
                            <node-label class="noclick">
                                <fa-icon (click)="ph.selected = !ph.selected" [icon]="ph.selected ? faTimes : faArrowLeft"></fa-icon>
                                {{ph.label}}
                            </node-label>
                        </li>
                    </ul>
                </li>
            </ul>
        </div>
    </div>
    <p><strong>Note:</strong> The "select-tree" is not a component but a set of styles for re-usable markup and a single component for labeling a node within the tree.</p>
    <p>A "select-tree" is simply a <code>&lt;ul&gt;</code> with the class <code>select-tree</code> on it.  Each inner <code>&lt;li&gt;</code> should first contain a
    <code>&lt;node-label&gt;</code> element with the label for that node.  If a given node contains a sub-tree then it should simply contain another <code>&lt;ul&gt;</code>.
    Each nested <code>&lt;ul&gt;</code> should then have a class <code>level-N</code> where N indicates its level in the tree (starting with 1 assuming the top-level tree is 0).</p>
    <p>For simplicity the tree uses CSS animation for collapsing nested sub-trees.  There is a maximum number of children allowed within a given sub-tree
    and this is used to determine a <code>max-height</code> so when collapsing a tree there will be slight initial pause in the animation.</p>
    <p>Each <code>node-label</code> within the tree is assumed to do something when clicking on it, either expand/collapse of children or select/deselect of leaf nodes.
    I.e. The <code>node-label</code> itself would have a <code>(click)</code> directive on it to do something.  If this is not the case then add the class
    <code>noclick</code></p>
    `,
    styles: [`
    .dev-container-wrapper {
        display: flex;
        justify-content: space-evenly;
        margin-bottom: 15px;
    }
    .dev-container-wrapper >div {
        border: 1px solid #ddd;
        height: 300px;
        width: 250px;
        background-color: #fff;
        position: relative;
    }
    .dev-container-wrapper >div .note {
        position: absolute;
        bottom: 0px;
        left: 0px;
    }
    .leaf>node-label fa-icon {
        margin-right: 5px;
        color: red;
    }
    .leaf>node-label fa-icon:hover {
        cursor: pointer;
    }
    .leaf.selected>node-label fa-icon {
        color: blue;
    }
    `]
})
export class SelectTreeRoute {
    firstLeafCollapsed = false;
    firstLeafs = [
        {label:'Spring index'},
        {label:'Lilac'},
        {label: 'Arnold red honeysuckle',selected:true},
        {label: 'Zabelii honeysuckle'},
    ];

    faTimes = faTimes;
    faArrowLeft = faArrowLeft;
    species = [
        {
            label: 'Maple',
            sub: 'family',
            collapsed: false,
            phenos: [
                {label:'Bud'},
                {label:'Leafing',selected:true},
                {label:'Blooming',selected:true},
                {label:'Pollen release'},
            ]
        },
        {
            label: 'Rosy maple moth',
            sub: 'species',
            collapsed: true,
            phenos: [
                {label:'Flying'},
                {label:'Foraging'},
                {label:'Cacooning'},
                {label:'Light chasing'},
            ]
        }
    ]
    mapleCollapsed = false;
    maplePhenos = [
        {label:'Bud'},
        {label:'Leafing',selected:true},
        {label:'Blooming',selected:true},
        {label:'Pollen release'},
    ]
}