import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestitutionChartComponent } from './restitution-chart.component';

describe('RestitutionChartComponent', () => {
  let component: RestitutionChartComponent;
  let fixture: ComponentFixture<RestitutionChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestitutionChartComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RestitutionChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
