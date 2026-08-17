import { NpnConfiguration } from '@npn/common';

const npnConfiguration:NpnConfiguration = {
  cacheTTL: 60,
  apiRoot: '//www-dev.usanpn.org',
  //apiRoot: 'https://www.usanpn.org',
  dataApiRoot: 'https://data-dev.usanpn.org/geoservices',
  // dataApiRoot: 'https://data.usanpn.org/geoservices',
  dataApiRoot2: 'https://data-dev.usanpn.org/webservices',
  dataApiUseStatisticsCache: false,
  //geoServerRoot: '//geoserver-dev.usanpn.org/geoserver',
  geoServerRoot: 'https://geoserver.usanpn.org/geoserver',
  tinybirdApiRoot: 'https://api.us-west-2.aws.tinybird.co',
  tinybirdTokenUrl: 'https://services2-dev.usanpn.org/v1/data/token',
  servicesApiRoot: 'https://services2-dev.usanpn.org',
  // The production portal on purpose. Export used to hardcode data-dev.usanpn.org here,
  // but that host no longer resolves at all (verified 2026-08-12, same fate as
  // www-dev.usanpn.org). Since searches are saved to servicesApiRoot above and redeemed
  // by this page, a dev portal -- if one comes back -- would have to read the same store
  // this host writes to.
  observationPortalUrl: 'https://test.d34tw1egjgmvnb.amplifyapp.com'
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
