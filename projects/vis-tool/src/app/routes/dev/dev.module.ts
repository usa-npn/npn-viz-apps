import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MaterialModule } from '../../material';
import { DevRouterComponent } from './dev-router.component';
import { SelectTreeRoute } from './select-tree.route';
import { SpeciesPhenoRoute } from './species-pheno.route';
import { VisualizationsModule } from '@npn/common';

const routes:Routes = [{
    path: '',
    component: DevRouterComponent,
    children: [
        {path: '', component: SelectTreeRoute},
        {path: 'selectTree', component: SelectTreeRoute},
        {path: 'speciesPheno', component: SpeciesPhenoRoute}
    ]
}];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        MaterialModule,
        VisualizationsModule
    ],
    declarations: [
        DevRouterComponent,
        SelectTreeRoute,
        SpeciesPhenoRoute
    ],
    exports: [
        RouterModule
    ]
})
export class DevModule{}