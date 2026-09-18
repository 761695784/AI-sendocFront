import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicationTypeChartComponent } from './publication-type-chart.component';

describe('PublicationTypeChartComponent', () => {
  let component: PublicationTypeChartComponent;
  let fixture: ComponentFixture<PublicationTypeChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicationTypeChartComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PublicationTypeChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
