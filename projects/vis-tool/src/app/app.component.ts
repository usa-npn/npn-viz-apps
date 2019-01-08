import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

import {
  IconDefinition,
  faStreetView,
  faMapMarkedAlt,
  faArrowLeft
} from '@fortawesome/pro-light-svg-icons';

import { RoutePath } from './app-routing.module';

interface MenuItem {
  routerLink: RoutePath,
  icon: IconDefinition;
  title: string;
  caption: string;
  navExpandedWhenActive: boolean;
}

/**
 * Base application component that handles top-level menu/navigation to application routes.
 */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  faArrowLeft = faArrowLeft;
  // technically the drawer is always open it just shrinks when "collapsed" since only the icon remains
  mainNavExpanded:boolean = true;

  menuItems:MenuItem[] = [{
    routerLink: RoutePath.PHENO_NEAR,
    icon: faStreetView,
    title: 'Phenology near me',
    caption: 'Seasons and cycles in my area',
    navExpandedWhenActive: true
  },{
    routerLink: RoutePath.EXPLORE_PHENO,
    icon: faMapMarkedAlt,
    title: 'Explore phenological findings',
    caption: 'Plant, animal and phenophase charts and maps',
    navExpandedWhenActive: false
  }];

  constructor(private router:Router){}

  ngOnInit() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e:NavigationEnd) => {
        const activeItem:MenuItem = this.menuItems.find(mi => (new RegExp(`^\\/${mi.routerLink}`)).test(e.url))
        this.mainNavExpanded = activeItem ? activeItem.navExpandedWhenActive : true;
      });
  }
}
