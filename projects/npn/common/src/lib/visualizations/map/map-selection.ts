import { VisSelection } from '../vis-selection';

export class MapSelection extends VisSelection {
    $class = 'MapSelection';

    isValid():boolean {
        return false;
    }
}