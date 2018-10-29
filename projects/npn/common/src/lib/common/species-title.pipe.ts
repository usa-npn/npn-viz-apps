import { Pipe, PipeTransform } from '@angular/core';

import { Species } from './species';

@Pipe({ name: 'speciesTitle' })
export class SpeciesTitlePipe implements PipeTransform {
    transform(item: Species, format?: string): any {
        if (item) {
            // TODO get from app runtime config
            format = format || 'common-name';
            if (format === 'common-name') {
                if (item.common_name) {
                    let lower = item.common_name.toLowerCase();
                    return lower.substring(0, 1).toUpperCase() + lower.substring(1);
                }
                return item.common_name;
            } else if (format === 'scientific-name') {
                return `${item.genus} ${item.species}`;
            }
        }
        return item;
    }
}
