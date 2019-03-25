import { NpnConfiguration } from '@npn/common';

const npnConfiguration:NpnConfiguration = {
  cacheTTL: 60,
  apiRoot: '//www.usanpn.org',
  dataApiRoot: '//data.usanpn.org:3006',
  dataApiRoot2: '//data-dev.usanpn.org:3004',
  dataApiUseStatisticsCache: false,
  geoServerRoot: '//geoserver.usanpn.org/geoserver'
};
export const environment = {
  production: true,
  googleMapsApiKey: 'AIzaSyAsTM8XaktfkwpjEeDMXkNrojaiB2W5WyE',
  npnConfiguration
};
