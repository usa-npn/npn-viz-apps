import * as $jq_ from 'jquery';
const $jq = $jq_;

import { NpnMapLayer } from './wms-map-layer';
import { GriddedPipeProvider } from './pipes';

import { Selection } from 'd3-selection';
import * as d3 from 'd3';
import { NpnLayerDefinition } from './gridded-common';

const IDENTITY = d => d;

export abstract class NpnMapLegend {
    private layer:NpnMapLayer;

    private lformat:Function;
    private gformat:Function;
    private title_data:any;
    private data:any[];
    private length:number;

    constructor(protected griddedPipes:GriddedPipeProvider,
                protected color_map:any,
                /*
                NOTE: per the original implementation which binds extents directly into the definition this is public
                may want to later revisit some abstraction, used externally via WmsMapLegendComponent
                 */
                public ldef:NpnLayerDefinition,
                protected styleDefinition:any) {
            console.log('WmsMapLegend.color_map',color_map);
            console.log('WmsMapLegend.ldef',ldef);
            console.log('WmsMapLegend.styleDefinition',styleDefinition);
            let get_filter = (filter_def) => {
                let pipe = this.griddedPipes.get(filter_def.name);
                if(!pipe) {
                    console.error(`WmsMapLegend: Unable to find pipe named ${filter_def.name}`);
                }
                return function(l,q) {
                    let args = [q];
                    if(filter_def.args) {
                        args = args.concat(filter_def.args);
                    }
                    return pipe.transform.apply(pipe, args);
                };
            };
            this.lformat = ldef.legend_label_filter ? get_filter(ldef.legend_label_filter) : IDENTITY;
            this.gformat = ldef.gridded_label_filter ? get_filter(ldef.gridded_label_filter) : undefined;
            let entries = color_map.find('ColorMapEntry');
            if(entries.length === 0) {
                entries = color_map.find('sld\\:ColorMapEntry');
            }
            let data = entries.toArray().reduce((arr,entry,i) => {
                var e = $jq(entry),
                    q = parseFloat(e.attr('quantity')),
                    l = e.attr('label');
                arr.push({
                    color: e.attr('color'),
                    quantity: q,
                    original_label: l,
                    label: i === 0 ? l : this.lformat(l,q) // why the special case for index 0?
                });
                return arr;
            },[]);
            this.title_data = data[0];
            this.data = data.slice(1);
            this.length = this.data.length;
    }

    setLayer(l:NpnMapLayer):NpnMapLegend {
        this.layer = l;
        return this;
    }

    getData():any[] {
        return this.data;
    }

    getStyleDefinition():any {
        return this.styleDefinition;
    }

    getTitle():string {
        return this.title_data.label;
    }

    getColors():string[] {
        return this.data.map(d => d.color);
    }

    getQuantities():number[] {
        return this.data.map(d => d.quantity);
    }

    getLabels():string[] {
        return this.data.map(d => d.label);
    }

    getOriginalLabels():string[] {
        return this.data.map(d => d.original_label);
    }

    formatPointData(q) {
        return (this.gformat||this.lformat)(q,q);
    }

    getPointData(q) {
        var i,d,n;
        for(i = 0; i < this.data.length; i++) {
            d = this.data[i];
            n = (i+1) < this.data.length ? this.data[i+1] : undefined;
            if(q == d.quantity) {
                return d;
            }
            if(n && q >= d.quantity && q < n.quantity) {
                return d;
            }
        }
    }

    abstract redraw(svg:Selection<any,any,any,any>,legendTitle:string):void;
}


export class WmsMapLegend extends NpnMapLegend {
    redraw(svg:Selection<any,any,any,any>,legendTitle:string):void {
        const legend = this;
        if(svg) {
            svg.selectAll('g').remove();
        }

        if(!legend || !svg) {
            return;
        }
        let width = parseFloat(svg.style('width').replace('px','')),
            height = parseFloat(svg.style('height').replace('px','')),
            data = legend.getData(),
            mid_idx = Math.floor(data.length/2),
            cell_width = width/data.length,
            cell_height = 30,
            top_pad = 2;
        console.debug('WmsMapLegend.svg dimensions',width,height);
        console.debug('WmsMapLegend.legend cell width',cell_width);

        let g = svg.append('g'),
            cell = g.selectAll('g.cell')
                     .data(data)
                     .enter()
                     .append('g')
                     .attr('class',(d,i) => {
                        return 'cell'+
                            ((i === 0) ? ' first' :
                             ((i === mid_idx) ? ' middle' :
                              ((i === data.length -1) ? ' last' : '')));
                     })
                     .attr('transform',function(d,i) { return 'translate('+(i*cell_width)+','+top_pad+')'; })
                     .append('rect')
                     .attr('height',cell_height)
                     .attr('width',cell_width)
                     .style('stroke','black')
                     .style('stroke-width','1px')
                     .style('fill',function(d,i) { return d.color; });

         if(legend.ldef.legend_delimiter_every) {
             let every = legend.ldef.legend_delimiter_every,
                 running_total = 0,
                 separators = data.map(function(d,i){
                     if((i+1) === data.length) {
                         return true;
                     }
                     running_total += (data[i+1].quantity - data[i].quantity);
                     if(running_total >= every) {
                         running_total = 0;
                         return true;
                     }
                     return false;
                 }),
                 top_bottom = [(cell_width+1),cell_height,(cell_width+1),cell_height].join(','), //{ stroke-dasharray: $w,$h,$w,$h }
                 top_right_bottom = [((cell_width*2)+cell_height),cell_height].join(','), //{ stroke-dasharray: (($w*2)+$h),$h }
                 top_left_bottom = [(cell_width+1),cell_height,(cell_width+cell_height+1),0].join(','); ////{ stroke-dasharray: $w,$h,($w+$h),0 }

             console.debug('WmsMapLegend.legend_delimiter_every',every);
             cell.style('stroke-dasharray',function(d,i){
                 if(i === 0) {
                     return separators[i] ? undefined : top_left_bottom;
                 }
                 return separators[i] ? top_right_bottom : top_bottom;
             })
             // top_bottom removes the left/right borders which leaves a little whitespace
             // which looks odd so in cases where there is no right border increase a cell's width
             // by 1px to cover that gap
             .attr('width',function(d,i){
                 var w = parseFloat(d3.select(this).attr('width'));
                 if(i === 0) {
                     return separators[i] ? w : w+1;
                 }
                 return separators[i] ? w : w+1;
             });
             g.selectAll('g.cell').append('line')
                  .attr('stroke',function(d,i){ return separators[i] ? 'black' : 'none'; })
                  .attr('stroke-width', 2)
                  .attr('x1',cell_width-1)
                  .attr('x2',cell_width-1)
                  .attr('y1',0)
                  .attr('y2',cell_height);
         }
         cell.append('title').text(function(d) { return d.label; });

         let tick_length = 5,
             tick_padding = 3;

         function label_cell(cell,label,anchor) {
             let tick_start = (top_pad+cell_height+tick_padding);
             cell.append('line')
                 .attr('x1',(cell_width/2))
                 .attr('y1',tick_start)
                 .attr('x2',(cell_width/2))
                 .attr('y2',tick_start+tick_length)
                 .attr('stroke','black')
                 .attr('stroke-width','1');
             cell.append('text')
                 .attr('dx',(cell_width/2))
                 .attr('dy','4em'/*cell_height+tick_length+(2*tick_padding)*/) // need to know line height of text
                 .style('text-anchor',anchor)
                 .text(label);
         }
         label_cell(svg.select('g.cell.first'),data[0].label,'start');
         label_cell(svg.select('g.cell.middle'),data[mid_idx].label,'middle');
         label_cell(svg.select('g.cell.last'),data[data.length-1].label,'end');

         if(legend.ldef.legend_units) {
             svg.append('g')
                .append('text')
                .attr('dx',(width/2))
                .attr('dy',75+top_pad)
                .attr('text-anchor','middle')
                .text(legend.ldef.legend_units);
         }
        
        // if given an explicit title use it o/w use the info from the
        // legend definition, etc.
        let legend_title;
        if(legendTitle) {
            legend_title = legendTitle;
        } else {
            legend_title = legend.ldef.title;
            if(legend.ldef.extent && legend.ldef.extent.current) {
                legend_title += `, ${legend.ldef.extent.current.label}`
            }
        }
		svg.append('g').append('text').attr('dx',5)
            .attr('dy',100+top_pad)
			.attr('font-size', '18px')
            .attr('text-anchor','right').text(legend_title);

		svg.append('g').append('text').attr('dx',5)
            .attr('dy',118+top_pad)
			.attr('font-size', '11px')
            .attr('text-anchor','right').text('USA National Phenology Network, www.usanpn.org');
    }
}

export class PestMapLegend extends NpnMapLegend {
    redraw(svg:Selection<any,any,any,any>,legendTitle:string):void {
        const legend = this;

        const width = parseFloat(svg.style('width').replace('px','')),
            height = parseFloat(svg.style('height').replace('px','')),
            // only data w/out 'ignore' in them
            data = legend.getData().filter(d => d.original_label.indexOf('ignore') === -1),
            cell_width = 20,
            cell_height = 20;
        console.debug('PestMapLegend.svg dimensions',width,height);
        console.debug('PestMapLegend.legend cell width',cell_width);
        console.debug('PestMapLegend.data',data);

        const g = svg.append('g'),
            cell = g.selectAll('g.cell')
         .data(data)
         .enter()
         .append('g')
            .attr('class','cell')
            .attr('transform',function(d,i) { return 'translate('+0+','+(i*cell_width)+')'; });
        // add the  colored legend boxes.
        cell.append('rect')
            .attr('height',cell_height)
            .attr('width',cell_width)
            .style('stroke','black')
            .style('stroke-width','1px')
            .style('fill',d => d.color)
                .append('title').text(d => `${d.quantity}`);
        // add the labels
        cell.append('text')
            .attr('dx','2.4em')
            .attr('dy',(cell_width/1.5))
            .style('text-anchor','start')
            .text(d => d.original_label);

        function label_cell(cell,label,anchor) {
            cell.append('text')
                .attr('dx','2.4em')
                .attr('dy',(cell_width/1.5)/*cell_height+tick_length+(2*tick_padding)*/) // need to know line height of text
                .style('text-anchor',anchor)
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
        if(['emerald_ash_borer','lilac_borer','apple_maggot'].indexOf(legend.ldef.name) !== -1) {
            treatmentMethod = 'Window for Managing Adults';
        } else if (legend.ldef.name === 'winter_moth') {
            treatmentMethod = 'Window for Managing Caterpillars';
        }
        if(treatmentMethod) {
            
            svg.append('g').append('text').attr('dx',5)
            .attr('dy',20+legendHeight)
            .attr('font-size', '16px')
            .attr('text-anchor','right').text(legend.ldef.title + ' Forecast' + ', ' + legend.ldef.extent.current.label);

            svg.append('g').append('text').attr('dx',5)
           .attr('dy',38+legendHeight)
           .attr('font-size', '14px')
           .attr('text-anchor','right').text(treatmentMethod);

            svg.append('g').append('text').attr('dx',5)
           .attr('dy',54+legendHeight)
           .attr('font-size', '11px')
           .attr('text-anchor','right').text('USA National Phenology Network, www.usanpn.org');
        } else {
            svg.append('g').append('text').attr('dx',5)
            .attr('dy',30+legendHeight)
            .attr('font-size', '16px')
            .attr('text-anchor','right').text(legend.ldef.title + ' Forecast' + ', ' + legend.ldef.extent.current.label);

            svg.append('g').append('text').attr('dx',5)
           .attr('dy',48+legendHeight)
           .attr('font-size', '11px')
           .attr('text-anchor','right').text('USA National Phenology Network, www.usanpn.org');
        }
    }
}