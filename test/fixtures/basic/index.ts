import { NgModule, Component } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { CommonModule } from '@angular/common'

@Component({
  selector: 'main-component',
  template: '<div *ngIf="visible">Hello world</div>',
})
export class MainComponent {
  visible: boolean
}

@NgModule({
  imports: [CommonModule, BrowserModule],
  exports: [MainComponent],
  declarations: [MainComponent],
  bootstrap: [MainComponent],
})
export class AppModule {}
