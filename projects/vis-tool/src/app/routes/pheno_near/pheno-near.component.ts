import { Component } from "@angular/core";

@Component({
    template: `
    pheno near me<br />
    <button mat-raised-button>Default</button><br /><br />
    <button mat-raised-button color="primary">Primary</button><br /><br />
    <button mat-raised-button color="accent">Accent</button><br /><br />
    <button mat-raised-button color="warn">Warn</button>
    `
})
export class PhenoNearComponent {}