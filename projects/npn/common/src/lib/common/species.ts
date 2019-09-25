
interface HasKingdom {
    kingdom?: string;
}

export interface Species extends HasKingdom {
    species_id: string;
    [x: string]: any;
}

export interface TaxonomicClass extends HasKingdom {
    class_id: number;
    class_name: string;
    class_common_name: string;
}

export interface TaxonomicOrder extends HasKingdom {
    order_id:number;
    order_name:string;
    order_common_name:string; // sometimes empty?
}

export interface TaxonomicFamily extends HasKingdom {
    family_id:number;
    family_name:string;
    family_common_name:string;
}

export interface TaxonomicSpecies extends TaxonomicClass,TaxonomicFamily,TaxonomicOrder,Species {
    genus: string;
    itis_taxonomic_sn: number;
    number_observations?: number; // depends on the service getSpeciesFilter.json returns this
    species_type?:any[]; // has type but not using
}

export type TaxonomicSpeciesType = Species|TaxonomicClass|TaxonomicOrder|TaxonomicFamily;

export enum TaxonomicSpeciesRank {
    SPECIES = 'species',
    FAMILY = 'family',
    ORDER = 'order',
    CLASS = 'class'
}