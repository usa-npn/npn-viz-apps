import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RoutePath } from './route-path';
import {
    ExplorePhenoComponent,
    StoriesComponent,
    SettingsComponent
} from './routes';

const ROUTES:Routes = [{
    path: '',
    component: StoriesComponent
},{
    path: RoutePath.STORIES,
    component: StoriesComponent
},{
    path: RoutePath.EXPLORE_PHENO,
    component: ExplorePhenoComponent
},{
    path: RoutePath.SETTINGS,
    component: SettingsComponent
},{
    path: RoutePath.DEV,
    loadChildren: './routes/dev/dev.module#DevModule'
}];

@NgModule({
    imports: [RouterModule.forRoot(ROUTES,{useHash:true})],
    exports: [RouterModule]
  })
export class AppRoutingModule {}