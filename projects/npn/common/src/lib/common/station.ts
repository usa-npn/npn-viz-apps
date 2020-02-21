export interface Station {
    // file_url: string;
    latitude:number;
    longitude:number;
    network_id:number;
    station_id:number;
    station_name:string;
    num_individuals?:number;
    num_records?:number;
    site_name?:string;
    group_name?:string;
    // allow arbitrary keys for use by controls
    [x:string]:any;
    icon?:string;
}