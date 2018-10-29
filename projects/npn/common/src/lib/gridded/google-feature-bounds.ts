// this may not be the best or final home for this functionality...
export function googleFeatureBounds(feature) {
    var geo = feature.getGeometry(),
        type = geo.getType();
    /*if(!type || /LineString/.test(type)) {
        // TODO ? generate bounds of a [Multi]LineString?
    } else {*/
    if (type && /Polygon/.test(type)) {
        var bounds = new google.maps.LatLngBounds(),
            arr = geo.getArray(),
            rings = type === 'Polygon' ?
                arr :
                arr.reduce(function (c, p) {
                    c.push(p.getArray()[0]);
                    return c;
                }, []), i, j;
        for (i = 0; i < rings.length; i++) {
            var ringArr = rings[i].getArray();
            for (j = 0; j < ringArr.length; j++) {
                bounds.extend(new google.maps.LatLng(ringArr[j].lat(), ringArr[j].lng()));
            }
        }
        return bounds;
    }
}