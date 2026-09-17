import { NpnConfiguration } from '@npn/common';

const npnConfiguration:NpnConfiguration = {
  cacheTTL: 60,
  apiRoot: 'https://services.usanpn.org',
  dataApiRoot: 'https://services.usanpn.org/geo-services',
  dataApiRoot2: 'https://services.usanpn.org/web-services',
  popApiRoot: 'https://services.usanpn.org/pop-services',
  dataApiUseStatisticsCache: false,
  geoServerRoot: 'https://geoserver.usanpn.org/geoserver'
};
export const environment = {
  production: true,
  googleMapsApiKey: 'AIzaSyC3jyxxwpe16ahPurnsbQCrKCWEzqlxR_U',
  npnConfiguration
};
