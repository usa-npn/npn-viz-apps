import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

import {
  IconDefinition,
  faArrowLeft,
  faCogs,
  faCode,
  faBooks,
  faChartLine
} from '@fortawesome/pro-light-svg-icons';

import { RoutePath } from './route-path';
import { environment } from '../environments/environment';

enum AppTheme {
  LIGHT = 'light',
  DARK = 'dark'
}

interface MenuItem {
  routerLink: RoutePath|string,
  icon: IconDefinition;
  title: string;
  caption: string;
  navExpandedWhenActive: boolean;
  theme: AppTheme
}

/**
 * Base application component that handles top-level menu/navigation to application routes.
 */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styles:[`
  mat-drawer {
      scrollbar-width: none; /* Firefox disable scrollbars */
      -ms-overflow-style: none;  /* IE 10+ disable scrollbars */
  }
  mat-drawer::-webkit-scrollbar {
      width: 0px;
      background: transparent; /* Chrome/Safari/Webkit disable scrollbars */
  }
  `]
})
export class AppComponent {
  faArrowLeft = faArrowLeft;
  // technically the drawer is always open it just shrinks when "collapsed" since only the icon remains
  mainNavExpanded:boolean = true;
  routeTheme:AppTheme;

  menuItems:MenuItem[] = [{
    routerLink: RoutePath.STORIES,
    icon: faBooks,
    title: 'Seasonal Stories',
    caption: 'Quick access to curated visualizations',
    navExpandedWhenActive: true,
    theme: AppTheme.LIGHT
  },{
    routerLink: RoutePath.EXPLORE_PHENO,
    icon: faChartLine,
    title: 'Data Explorer',
    caption: 'Select data & create visualizations',
    navExpandedWhenActive: false,
    theme: AppTheme.LIGHT
  },{
    routerLink: RoutePath.SETTINGS,
    icon: faCogs,
    title: 'Settings',
    caption: 'Update application level settings',
    navExpandedWhenActive: true,
    theme: AppTheme.LIGHT
  }];

  constructor(private router:Router){}

  ngOnInit() {
    if(!environment.production) {
      this.menuItems.push({
        routerLink: `${RoutePath.DEV}/selectTree`,
        icon: faCode,
        title: 'Dev',
        caption: 'Development',
        navExpandedWhenActive: false,
        theme: AppTheme.LIGHT
      });
    }
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e:NavigationEnd) => {
        const activeItem:MenuItem = this.menuItems.find(mi => (new RegExp(`^\\/${mi.routerLink}`)).test(e.url))
        this.mainNavExpanded = activeItem ? activeItem.navExpandedWhenActive : true;
        if(!environment.production && /^\/dev\//.test(e.url)) {
          this.mainNavExpanded = false;
        }
        this.routeTheme = (activeItem ? activeItem.theme : null)||AppTheme.LIGHT;
      });
  }
}
