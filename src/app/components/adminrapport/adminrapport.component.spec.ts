import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminrapportComponent } from './adminrapport.component';

describe('AdminrapportComponent', () => {
  let component: AdminrapportComponent;
  let fixture: ComponentFixture<AdminrapportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminrapportComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdminrapportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
