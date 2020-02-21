export const STATIC_COLORS  = [
    '#1f77b4','#ff7f0e','#2ca02c','#d62728','#222299', '#c51b8a',  '#8c564b', '#637939', '#843c39',
    '#5254a3','#636363',
    '#bcbd22', '#7b4173','#e7ba52', '#222299',  '#f03b20', '#1b9e77','#e377c2',  '#ef8a62', '#91cf60', '#9467bd'
  ];
/**
 * Fetches a color by numeric index.  The domain of colors is finite so if the
 * index overflows the array then it will wrap around as necessary.
 * I.e. if index=colors.length+1 index=0
 * @param index The numeric index to fetch a color for.
 */
export function getStaticColor(index:number):string {
    return STATIC_COLORS[index%STATIC_COLORS.length];
}