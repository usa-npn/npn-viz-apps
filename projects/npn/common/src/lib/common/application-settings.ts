/**
 * Ways in which a species' title can be displayed.
 * @see SpeciesTitlePipe
 */
export enum SpeciesTitleFormat {
    CommonName = 'common-name',
    ScientificName = 'scientific-name'
};

export interface AppSettings {
    /** 'common-name' || 'scientific-name */
    speciesTitleFormat?: SpeciesTitleFormat;
}

/**
 * Holds application level settings that can be altered by the user.
 * This is just a class and not an `@Injectable` service because it has
 * no `@Injectable` dependencies so it's just more simple.
 */
class ApplicationSettings implements AppSettings {
    private settings:AppSettings = {
        speciesTitleFormat: SpeciesTitleFormat.CommonName
    };

    get speciesTitleFormat():SpeciesTitleFormat { return this.settings.speciesTitleFormat; }
    set speciesTitleFormat(f:SpeciesTitleFormat) { this.settings.speciesTitleFormat = f; }
}

export const APPLICATION_SETTINGS = new ApplicationSettings();