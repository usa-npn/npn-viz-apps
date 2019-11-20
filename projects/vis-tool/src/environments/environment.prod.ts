import { NpnConfiguration } from '@npn/common';

const npnConfiguration:NpnConfiguration = {
  cacheTTL: 60,
  apiRoot: '//www.usanpn.org',
  dataApiRoot: 'https://data.usanpn.org/geoservices',
  dataApiRoot2: 'https://data.usanpn.org/webservices',
  popApiRoot: 'https://data.usanpn.org/popservices',
  dataApiUseStatisticsCache: false,
  geoServerRoot: '//geoserver.usanpn.org/geoserver'
};
export const environment = {
  production: true,
  googleMapsApiKey: 'AIzaSyAsTM8XaktfkwpjEeDMXkNrojaiB2W5WyE',
  npnConfiguration
};
