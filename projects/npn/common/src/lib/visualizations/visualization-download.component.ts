import { Component, Input } from '@angular/core';

import { faDownload } from '@fortawesome/pro-light-svg-icons';

import * as d3 from 'd3';

@Component({
    selector: 'visualization-download',
    template: `
    <div class="vis-download">
        <a href (click)="download($event)" title="Download"><fa-icon [icon]="faDownload"></fa-icon></a>
        <canvas id="dlcanvas-{{svgWrapperId}}" style="display: none;"></canvas>
        <a id="dllink-{{svgWrapperId}}" style="display: none;">download</a>
    </div>
    `,
    styles: [`
        .vis-download {
            height: 28px;
            width: 28px;
            position: absolute;
            right: 0px;
            margin: 10px;
            font-size: 1.5em;
        }
        .vis-download >a {
            color: #000;
            &:hover {
                color: #000;
            }
        }
    `]
})
export class VisualizationDownloadComponent {
    faDownload = faDownload;
    @Input() svgWrapperId: string;
    @Input() filename: string;

    download($event): void {
        $event.preventDefault();

        let svg = document.querySelector(`#${this.svgWrapperId} >svg`) as SVGElement,
            wrappedSvg = d3.select(svg);
        wrappedSvg.attr('version', 1.1)
            .attr('xmlns', 'http://www.w3.org/2000/svg');
        let parent = svg.parentNode as HTMLElement,
            html = parent.innerHTML,
            imgsrc = 'data:image/svg+xml;base64,' + window.btoa(html),
            canvas = document.querySelector(`#dlcanvas-${this.svgWrapperId}`) as HTMLCanvasElement,
            link = document.querySelector(`#dllink-${this.svgWrapperId}`) as HTMLAnchorElement;
        canvas.width = +wrappedSvg.attr('width');
        canvas.height = +wrappedSvg.attr('height');

        let context = canvas.getContext('2d'),
            image = new Image();
        image.onload = () => {
            context.drawImage(image, 0, 0);
            let canvasdata = canvas.toDataURL('image/png');
            link.download = this.filename;
            link.href = canvasdata;
            link.click();
        };
        image.src = imgsrc;
    }
}
