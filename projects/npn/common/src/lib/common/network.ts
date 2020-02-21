export interface Network {
    drupal_tid: number;
    name: string;
    network_id: number;
    no_group_site: number;
    user_display: number;
    // allow arbitrary keys for use by controls
    [x:string]:any;
}
