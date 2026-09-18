import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdmincertifComponent } from './admincertif.component';

describe('AdmincertifComponent', () => {
  let component: AdmincertifComponent;
  let fixture: ComponentFixture<AdmincertifComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdmincertifComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdmincertifComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
