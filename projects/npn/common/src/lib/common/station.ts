export interface Station {
    // file_url: string;
    latitude:number;
    longitude:number;
    network_id:number;
    station_id:number;
    station_name:string;
    // allow arbitrary keys for use by controls
    [x:string]:any;
}