import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminlogsComponent } from './adminlogs.component';

describe('AdminlogsComponent', () => {
  let component: AdminlogsComponent;
  let fixture: ComponentFixture<AdminlogsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminlogsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdminlogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
