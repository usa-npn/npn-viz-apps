import { Pipe, PipeTransform } from '@angular/core';

import { SpeciesTitleFormat, APPLICATION_SETTINGS } from './application-settings';
import { Species, TaxonomicSpeciesType, TaxonomicSpeciesRank, TaxonomicClass, TaxonomicOrder, TaxonomicFamily, TaxonomicGenus } from './species';

@Pipe({ name: 'speciesTitle' })
export class SpeciesTitlePipe implements PipeTransform {
    transform(item: Species, format?: SpeciesTitleFormat): any {
        if (item) {
            switch(format || APPLICATION_SETTINGS.speciesTitleFormat) {
                case SpeciesTitleFormat.CommonName:
                    if (item.common_name) {
                        let lower = item.common_name.toLowerCase();
                        return lower.substring(0, 1).toUpperCase() + lower.substring(1);
                    }
                    return item.common_name;
                case SpeciesTitleFormat.ScientificName:
                    return item && item.genus
                        ? `${item.genus} ${item.species}`
                        : undefined;
            }
        }
        return item;
    }
}

@Pipe({name: 'taxonomicSpeciesTitle'})
export class TaxonomicSpeciesTitlePipe implements PipeTransform {
    constructor(private speciesTitle:SpeciesTitlePipe) {}
    transform(item:TaxonomicSpeciesType,rank:TaxonomicSpeciesRank = TaxonomicSpeciesRank.SPECIES,format:SpeciesTitleFormat = APPLICATION_SETTINGS.speciesTitleFormat):any {
        if(item && typeof(item) === 'object') {
            let o;
            switch(rank) {
                case TaxonomicSpeciesRank.SPECIES:
                    o = item as Species;
                    return this.speciesTitle.transform(o,format);
                case TaxonomicSpeciesRank.CLASS:
                    o = item as TaxonomicClass;
                    return format === SpeciesTitleFormat.CommonName
                        ? o.class_common_name||`${o.class_name} (Scientific)` // || should not be necessary
                        : o.class_name;
                case TaxonomicSpeciesRank.ORDER:
                    o = item as TaxonomicOrder;
                    return format === SpeciesTitleFormat.CommonName
                        ? o.order_common_name||`${o.order_name} (Scientific)` // || should not be necessary
                        : o.order_name;
                case TaxonomicSpeciesRank.FAMILY:
                    o = item as TaxonomicFamily;
                    return format === SpeciesTitleFormat.CommonName
                        ? o.family_common_name||`${o.family_name} (Scientific)` // || should not be necessary
                        : o.family_name;
                case TaxonomicSpeciesRank.GENUS:
                    o = item as TaxonomicGenus;
                    return format === SpeciesTitleFormat.CommonName
                        ? o.genus_common_name||`${o.genus} (Scientific)` // || should not be necessary
                        : o.genus;
            }
        }
        return item;
    }
}
