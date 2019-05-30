import { Pipe, PipeTransform } from '@angular/core';

import { SpeciesTitleFormat, APPLICATION_SETTINGS } from './application-settings';
import { Species } from './species';

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
