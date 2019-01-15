import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RoutePath } from './route-path';
import {
    ExplorePhenoComponent,
    PhenoNearComponent
} from './routes';

const ROUTES:Routes = [{
    path: '',
    component: PhenoNearComponent
},{
    path: RoutePath.PHENO_NEAR,
    component: PhenoNearComponent
},{
    path: RoutePath.EXPLORE_PHENO,
    component: ExplorePhenoComponent
}];

@NgModule({
    imports: [RouterModule.forRoot(ROUTES)],
    exports: [RouterModule]
  })
export class AppRoutingModule {}