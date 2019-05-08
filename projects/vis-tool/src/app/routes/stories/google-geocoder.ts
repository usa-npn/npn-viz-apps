// unfortuantely @google/types does not include definitions for responses from Google's Geocoder service
// https://developers.google.com/maps/documentation/javascript/reference/geocoder#GeocoderResult
// not defining the entire interface, just the parts the application uses directly

export interface GeocoderAddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
}
export interface GeocoderLatLng {
    lat: number;
    lng: number;
}
export interface GeocoderBounds {
    northeast: GeocoderLatLng;
    southwest: GeocoderLatLng;
}
export interface GeocoderGeometry {
    location: GeocoderLatLng;
    location_type: string;
    viewport: GeocoderBounds;
    bounds?: GeocoderBounds;
}
export enum GeocoderStatus {
    OK = "OK",
    ZERO_RESULTS = "ZERO_RESULTS",
    OVER_DAILY_LIMIT = "OVER_DAILY_LIMIT",
    OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
    REQUEST_DENIED = "REQUEST_DENIED",
    INVALID_REQUEST = "INVALID_REQUEST",
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}
export interface GeocoderResult {
    // API and response do not actually match
    address_components: GeocoderAddressComponent[];
    formatted_address: string;
    geometry: GeocoderGeometry;
    partial_match?: boolean;
    place_id: string;
    types: string[];
    postcode_localities?: string[];
    plus_code?: any;
}
export interface GeocoderResponse {
    results: GeocoderResult[];
    status: GeocoderStatus|string;
    error_message?: string;
    plus_code?: any;
}