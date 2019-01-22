import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MaterialModule } from '../../material';
import { DevRouterComponent } from './dev-router.component';
import { SelectTreeRoute } from './select-tree.route';

const routes:Routes = [{
    path: '',
    component: DevRouterComponent,
    children: [
        {path: '', component: SelectTreeRoute},
        {path: 'selectTree', component: SelectTreeRoute}
    ]
}];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        MaterialModule
    ],
    declarations: [
        DevRouterComponent,
        SelectTreeRoute
    ],
    exports: [
        RouterModule
    ]
})
export class DevModule{}