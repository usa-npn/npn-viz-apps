import { NpnConfiguration } from '@npn/common';

const npnConfiguration:NpnConfiguration = {
  cacheTTL: 60,
  apiRoot: '//www-dev.usanpn.org',
  //apiRoot: 'https://www.usanpn.org',
  dataApiRoot: 'https://data-dev.usanpn.org:3006',
  //dataApiRoot: 'https://data.usanpn.org:3006',
  dataApiRoot2: 'http://data-dev.usanpn.org:3004',
  dataApiUseStatisticsCache: false,
  //geoServerRoot: '//geoserver-dev.usanpn.org/geoserver'
  geoServerRoot: 'https://geoserver.usanpn.org/geoserver'
};
// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  googleMapsApiKey: 'AIzaSyAsTM8XaktfkwpjEeDMXkNrojaiB2W5WyE',
  npnConfiguration
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
