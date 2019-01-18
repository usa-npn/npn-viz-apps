/**
 * Ways in which a species' title can be displayed.
 * @see SpeciesTitlePipe
 */
export enum SpeciesTitleFormat {
    CommonName = 'common-name',
    ScientificName = 'scientific-name'
};

interface AppSettings {
    filterLqdSummary: boolean;
    numDaysQualityFilter: number;
    speciesTitleFormat: SpeciesTitleFormat;
}

/**
 * Holds application level settings that can be altered by the user.
 * This is just a class and not an `@Injectable` service because it has
 * no `@Injectable` dependencies so it's just more simple.
 */
class ApplicationSettings {
    private settings:AppSettings = {
        filterLqdSummary: true,
        numDaysQualityFilter: 30,
        speciesTitleFormat: SpeciesTitleFormat.CommonName
    };

    get filterLqdSummary():boolean { return this.settings.filterLqdSummary; }
    set filterLqdSummary(b:boolean) { this.settings.filterLqdSummary = b; }

    get numDaysQualityFilter():number { return this.settings.numDaysQualityFilter; }
    set numDaysQualityFilter(n:number) { this.settings.numDaysQualityFilter = n; }

    get speciesTitleFormat():SpeciesTitleFormat { return this.settings.speciesTitleFormat; }
    set speciesTitleFormat(f:SpeciesTitleFormat) { this.settings.speciesTitleFormat = f; }
}

export const APPLICATION_SETTINGS = new ApplicationSettings();