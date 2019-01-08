import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import {
    ExplorePhenoComponent,
    PhenoNearComponent
} from './routes';

export enum RoutePath {
    PHENO_NEAR = 'phenology-near-me',
    EXPLORE_PHENO = 'explore-phenological-findings'

}

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