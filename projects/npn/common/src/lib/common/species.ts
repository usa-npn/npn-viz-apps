export interface Species {
    species_id: string;
    kingdom?: string;
    [x: string]: any;
}

export interface TaxonomicClass {
    class_id: number;
    class_name: string;
    class_common_name: string;
}

export interface TaxonomicOrder {
    order_id:number;
    order_name:string;
    order_common_name:string; // sometimes empty?
}

export interface TaxonomicFamily {
    family_id:number;
    family_name:string;
    family_common_name:string;
}

export interface TaxonomicSpecies extends TaxonomicClass,TaxonomicFamily,TaxonomicOrder,Species {
    genus: string;
    itis_taxonomic_sn: number;
    species_type:any[]; // has type but not using
}

export type TaxonmicSpeciesType = Species|TaxonomicClass|TaxonomicOrder|TaxonomicFamily;

export enum TaxonomicSpeciesRank {
    SPECIES = 'species',
    CLASS = 'class',
    ORDER = 'order',
    FAMILY = 'family'
}