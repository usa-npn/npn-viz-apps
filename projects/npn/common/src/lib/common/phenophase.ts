export class Phenophase {
    phenophase_id: number;    
    [x: string]: any
}

// NOTE: property names are inconsistent with how they work for species
// i.e. why not `phenophase_class_id` and `phenophase_class_name` ??
export interface PhenophaseClass {
    pheno_class_id: number;
    phenophase_category: string;
}

export interface TaxonomicPhenophase extends PhenophaseClass,Phenophase {

}

export enum TaxonomicPhenophaseRank {
    PHENOPHASE = 'phenophase',
    CLASS = 'class'
}
