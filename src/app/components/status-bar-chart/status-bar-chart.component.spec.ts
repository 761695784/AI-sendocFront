import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusBarChartComponent } from './status-bar-chart.component';

describe('StatusBarChartComponent', () => {
  let component: StatusBarChartComponent;
  let fixture: ComponentFixture<StatusBarChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBarChartComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StatusBarChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
