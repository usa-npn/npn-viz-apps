const BUCKETS = [
    [0.0,5.0],
    [5.0,25.0],
    [25.0,75.0],
    [75.0,95.0],
    [95.0,101.0] // just so < test is inclusive of 100.0
];
export const MARKER_COLORS = [
    '#ed3d3d', // < 5%
    '#f5a27a', // 5 - 25%
    '#828282', // 25 - 75%
    '#5cb3f2', // 75 - 95%
    '#3b3bf0' // > 95%
];
export const MARKER_ICONS = [
    'mean-5.png',
    'mean-5-25.png',
    'mean-25-75.png',
    'mean-75-95.png',
    'mean-95.png',
    'no-data.png'
];
export const FLI_DESCRIPTIONS = [
    'extremely early',
    'early',
    'average',
    'late',
    'extremely late'
];
export const FLI_PCNT_BUCKET_INDEX = (pcnt) => {
    if(isNaN(pcnt)) {
        return -1;
    }
    return BUCKETS.reduce((index,range,bucketIndex) => {
            if(index === -1) {
                if(pcnt >= range[0] && pcnt < range[1]) {
                    index = bucketIndex;
                }
            }
            return index;
        },-1);
};