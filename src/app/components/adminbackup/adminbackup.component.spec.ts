import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminbackupComponent } from './adminbackup.component';

describe('AdminbackupComponent', () => {
  let component: AdminbackupComponent;
  let fixture: ComponentFixture<AdminbackupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminbackupComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdminbackupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
