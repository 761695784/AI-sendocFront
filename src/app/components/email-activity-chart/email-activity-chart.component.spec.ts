import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailActivityChartComponent } from './email-activity-chart.component';

describe('EmailActivityChartComponent', () => {
  let component: EmailActivityChartComponent;
  let fixture: ComponentFixture<EmailActivityChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailActivityChartComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EmailActivityChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
