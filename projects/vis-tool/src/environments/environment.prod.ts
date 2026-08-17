import { NpnConfiguration } from '@npn/common';

const npnConfiguration:NpnConfiguration = {
  cacheTTL: 60,
  apiRoot: '//services-staging.usanpn.org',
  dataApiRoot: 'https://services-staging.usanpn.org/geo-services',
  dataApiRoot2: 'https://services-staging.usanpn.org/web-services',
  dataApiUseStatisticsCache: false,
  observationPortalUrl: 'https://test.d34tw1egjgmvnb.amplifyapp.com',
  geoServerRoot: '//geoserver.usanpn.org/geoserver',
  // Tinybird access is intentionally left unconfigured here.  As of 2026-07-30
  // https://services.usanpn.org/v1/data/token 404s and staging 503s -- only the dev
  // host serves tokens.  With these unset the interceptor matches no request and no
  // token is ever fetched, so production is unaffected.  Uncomment (and confirm the
  // host) once the endpoint exists in this environment.
  // tinybirdApiRoot: 'https://api.us-west-2.aws.tinybird.co',
  // tinybirdTokenUrl: 'https://services.usanpn.org/v1/data/token'
  //
  // Same story for the individual/site-level/magnitude phenometrics endpoints
  // (v1/data/individual_phenometrics, v1/data/site_phenometrics,
  // v1/data/magnitude_phenometrics) -- only confirmed against the dev host as of
  // 2026-08-11 (docs/plans/magnitude-site-level-data.md). With this unset,
  // ObservationService rejects each with a clear error rather than requesting a
  // malformed URL. Uncomment (and confirm the host) once verified here.
  //
  // NOTE: this now also gates boundaries (v1/boundaries, v1/boundaries/types). The
  // legacy {dataApiRoot2}/v0/boundaries fallback BoundaryApiService used to take when
  // this was unset has been removed -- those web services are being retired, so the
  // fallback was headed for a 404. Until this is set, the boundary picker is
  // non-functional in a production build.
   servicesApiRoot: 'https://services2-dev.usanpn.org',
  tinybirdApiRoot: 'https://api.us-west-2.aws.tinybird.co',
  tinybirdTokenUrl: 'https://services2-dev.usanpn.org/v1/data/token',
};
export const environment = {
  production: true,
  googleMapsApiKey: 'AIzaSyAsTM8XaktfkwpjEeDMXkNrojaiB2W5WyE',
  npnConfiguration
};
