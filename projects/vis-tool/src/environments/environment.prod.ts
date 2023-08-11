import { NpnConfiguration } from '@npn/common';

const npnConfiguration:NpnConfiguration = {
  cacheTTL: 60,
  apiRoot: '//services-staging.usanpn.org',
  dataApiRoot: 'https://services-staging.usanpn.org/geo-services',
  dataApiRoot2: 'https://services-staging.usanpn.org/web-services',
  popApiRoot: 'https://services-staging.usanpn.org/pop-services',
  dataApiUseStatisticsCache: false,
  geoServerRoot: '//geoserver.usanpn.org/geoserver'
};
export const environment = {
  production: true,
  googleMapsApiKey: 'AIzaSyAsTM8XaktfkwpjEeDMXkNrojaiB2W5WyE',
  npnConfiguration
};
