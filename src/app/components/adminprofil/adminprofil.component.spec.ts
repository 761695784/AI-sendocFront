import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminprofilComponent } from './adminprofil.component';

describe('AdminprofilComponent', () => {
  let component: AdminprofilComponent;
  let fixture: ComponentFixture<AdminprofilComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminprofilComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdminprofilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
