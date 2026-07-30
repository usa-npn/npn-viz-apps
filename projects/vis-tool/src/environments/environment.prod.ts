import { NpnConfiguration } from '@npn/common';

const npnConfiguration:NpnConfiguration = {
  cacheTTL: 60,
  apiRoot: '//services-staging.usanpn.org',
  dataApiRoot: 'https://services-staging.usanpn.org/geo-services',
  dataApiRoot2: 'https://services-staging.usanpn.org/web-services',
  popApiRoot: 'https://services-staging.usanpn.org/pop-services',
  dataApiUseStatisticsCache: false,
  geoServerRoot: '//geoserver.usanpn.org/geoserver',
  // Tinybird access is intentionally left unconfigured here.  As of 2026-07-30
  // https://services.usanpn.org/v1/data/token 404s and staging 503s -- only the dev
  // host serves tokens.  With these unset the interceptor matches no request and no
  // token is ever fetched, so production is unaffected.  Uncomment (and confirm the
  // host) once the endpoint exists in this environment.
  // tinybirdApiRoot: 'https://api.us-west-2.aws.tinybird.co',
  // tinybirdTokenUrl: 'https://services.usanpn.org/v1/data/token'
};
export const environment = {
  production: true,
  googleMapsApiKey: 'AIzaSyAsTM8XaktfkwpjEeDMXkNrojaiB2W5WyE',
  npnConfiguration
};
