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
                {quantity: 0, color: 'rgb(62,38,168)', original_label: '', label: 'Jan'},
                {quantity: 32, color: 'rgb(71,64,227)', original_label: '', label: 'Feb'},
                {quantity: 60, color: 'rgb(70,96,252)', original_label: '', label: 'Mar'},
                {quantity: 91, color: 'rgb(47,130,249)', original_label: '', label: 'Apr'},
                {quantity: 121, color: 'rgb(35,160,229)', original_label: '', label: 'May'},
                {quantity: 152, color: 'rgb(2,183,204)', original_label: '', label: 'Jun'},
                {quantity: 182, color: 'rgb(46,196,164)', original_label: '', label: 'Jul'},
                {quantity: 213, color: 'rgb(101,205,110)', original_label: '', label: 'Aug'},
                {quantity: 244, color: 'rgb(182,197,50)', original_label: '', label: 'Sep'},
                {quantity: 274, color: 'rgb(244,186,58)', original_label: '', label: 'Oct'},

                {quantity: 305, color: 'rgb(249,216,44)', original_label: '', label: 'Nov'},
                {quantity: 335, color: 'rgb(249,251,21)', original_label: '', label: 'Dec'},
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