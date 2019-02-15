import { MapLayerLegend } from './map-layer-legend';
import { GriddedPipeProvider } from './pipes';
import { WmsMapLayerLegend } from './wms-map-layer-legend';

export class DefaultMapLayerLegend extends WmsMapLayerLegend {
    constructor(protected griddedPipes:GriddedPipeProvider) {
        super(
            null, // no corresponding layer so no gridded functionality
            griddedPipes,
            [
                {quantity:-9999, color:'', original_label:'',label:''}, // first data always ignored.
                {quantity: 0, color: 'rgb(31,119,180)', original_label: '', label: 'Jan'},
                {quantity: 32, color: 'rgb(255,127,14)', original_label: '', label: 'Feb'},
                {quantity: 60, color: 'rgb(44,160,44)', original_label: '', label: 'Mar'},
                {quantity: 91, color: 'rgb(214,39,40)', original_label: '', label: 'Apr'},
                {quantity: 121, color: 'rgb(148,103,189)', original_label: '', label: 'May'},
                {quantity: 152, color: 'rgb(140,86,75)', original_label: '', label: 'Jun'},
                {quantity: 182, color: 'rgb(227, 119, 194)', original_label: '', label: 'Jul'},
                {quantity: 213, color: 'rgb(127, 127, 127)', original_label: '', label: 'Aug'},
                {quantity: 244, color: 'rgb(188, 189, 34)', original_label: '', label: 'Sep'},
                {quantity: 274, color: 'rgb(23, 190, 207)', original_label: '', label: 'Oct'},

                {quantity: 305, color: 'rgb(174,199,232)', original_label: '', label: 'Nov'},
                {quantity: 335, color: 'rgb(152,223,138)', original_label: '', label: 'Dec'},
            ],{
                name: 'Default',
                legend_label_filter: {
                    name: 'legendDoy'
                }
            },
            null // styleDefinition
        );
    }

    get layerName():string {
        return 'no-layer';
    }
}
/*
https://bl.ocks.org/pstuffa/3393ff2711a53975040077b7453781a9
schemeCategory20
rgb(174,199,232) // light blue
rgb(255,187,120) // light orange
rgb(152,223,138) // light green
rgb(255,152,150) // ligth red
rgb(197,176,213) // light purple
rgb(196,156,148) // light brown
rgb(247, 182, 210) // light pink
rgb(199, 199, 199) // light grey
rgb(219, 219, 141) // light green 2
rgb(158, 218, 229) // light aqua
 */