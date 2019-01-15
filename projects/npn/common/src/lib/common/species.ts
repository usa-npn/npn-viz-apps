export class Species {
    species_id: string;
    kingdom?: string;
    [x: string]: any;
}

export function speciesComparator(a:Species,b:Species):boolean {
    return a === b || (a && b && a.species_id === b.species_id);
}
