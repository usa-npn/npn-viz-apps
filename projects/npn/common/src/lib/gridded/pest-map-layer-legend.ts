import { Selection } from 'd3-selection';
import { MapLayerLegend } from './map-layer-legend';

export class PestMapLayerLegend extends MapLayerLegend {
    redraw(svg: Selection<any, any, any, any>, legendTitle: string): void {
        const legend = this;
        const width = parseFloat(svg.style('width').replace('px', '')), height = parseFloat(svg.style('height').replace('px', '')),
            // only data w/out 'ignore' in them
            data = legend.getData().filter(d => d.original_label.indexOf('ignore') === -1), cell_width = 20, cell_height = 20;
        console.debug('PestMapLegend.svg dimensions', width, height);
        console.debug('PestMapLegend.legend cell width', cell_width);
        console.debug('PestMapLegend.data', data);
        const g = svg.append('g'), cell = g.selectAll('g.cell')
            .data(data)
            .enter()
            .append('g')
            .attr('class', 'cell')
            .attr('transform', function (d, i) { return 'translate(' + 0 + ',' + (i * cell_width) + ')'; });
        // add the  colored legend boxes.
        cell.append('rect')
            .attr('height', cell_height)
            .attr('width', cell_width)
            .style('stroke', 'black')
            .style('stroke-width', '1px')
            .style('fill', d => d.color)
            .append('title').text(d => `${d.quantity}`);
        // add the labels
        cell.append('text')
            .attr('dx', '2.4em')
            .attr('dy', (cell_width / 1.5))
            .style('text-anchor', 'start')
            .text(d => d.original_label);
        function label_cell(cell, label, anchor) {
            cell.append('text')
                .attr('dx', '2.4em')
                .attr('dy', (cell_width / 1.5) /*cell_height+tick_length+(2*tick_padding)*/) // need to know line height of text
                .style('text-anchor', anchor)
                .text(label);
        }
        const legendHeight = cell_height * data.length;
        /* TODO, this won't work no such element, and doesn't seem appropriate as we should futz with the size of the SVG
        var pLegend = document.getElementsByClassName('pest-legend');
        pLegend[0].style.height = legendHeight + 48 + 10 +'px';
        if(legend.pest == 'Hemlock Woolly Adelgid') {
            pLegend[0].style.width = 445 + 'px';
        } else {
            pLegend[0].style.width = 350 + 'px';
        }
        // pLegend[0].style.width = 405 + 'px';
        */
        let treatmentMethod = null;
        if (['emerald_ash_borer', 'lilac_borer', 'apple_maggot'].indexOf(legend.ldef.name) !== -1) {
            treatmentMethod = 'Window for Managing Adults';
        }
        else if (legend.ldef.name === 'winter_moth') {
            treatmentMethod = 'Window for Managing Caterpillars';
        }
        if (treatmentMethod) {
            svg.append('g').append('text').attr('dx', 5)
                .attr('dy', 20 + legendHeight)
                .attr('font-size', '16px')
                .attr('text-anchor', 'right').text(legend.ldef.title + ' Forecast' + ', ' + legend.ldef.extent.current.label);
            svg.append('g').append('text').attr('dx', 5)
                .attr('dy', 38 + legendHeight)
                .attr('font-size', '14px')
                .attr('text-anchor', 'right').text(treatmentMethod);
            svg.append('g').append('text').attr('dx', 5)
                .attr('dy', 54 + legendHeight)
                .attr('font-size', '11px')
                .attr('text-anchor', 'right').text('USA National Phenology Network, www.usanpn.org');
        }
        else {
            svg.append('g').append('text').attr('dx', 5)
                .attr('dy', 30 + legendHeight)
                .attr('font-size', '16px')
                .attr('text-anchor', 'right').text(legend.ldef.title + ' Forecast' + ', ' + legend.ldef.extent.current.label);
            svg.append('g').append('text').attr('dx', 5)
                .attr('dy', 48 + legendHeight)
                .attr('font-size', '11px')
                .attr('text-anchor', 'right').text('USA National Phenology Network, www.usanpn.org');
        }
    }
}
