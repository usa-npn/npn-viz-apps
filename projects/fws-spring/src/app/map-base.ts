export class MapBase {
    private mapResolver;
    protected getMap:Promise<google.maps.Map> = new Promise(resolve => this.mapResolver = resolve);

    public latitude:number = 41.135760;
    public longitude:number = -99.157679;
    public zoom:number = 4;

    public mapStyles:any[] = [{
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{visibility:'off'}]
        },{
            featureType: 'transit.station',
            elementType: 'labels',
            stylers: [{visibility:'off'}]
        },
        {
            featureType: 'poi.park',
            stylers: [{ visibility: 'off'}]
        },
        {
            featureType: 'landscape',
            stylers: [{ visibility: 'off'}]
        }];

    protected configureMap(map:google.maps.Map) {
    }

    mapReady(map: google.maps.Map) {
        this.configureMap(map);
        this.mapResolver(map);
    }
}