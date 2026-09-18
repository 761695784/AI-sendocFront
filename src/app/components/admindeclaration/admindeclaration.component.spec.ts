import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdmindeclarationComponent } from './admindeclaration.component';

describe('AdmindeclarationComponent', () => {
  let component: AdmindeclarationComponent;
  let fixture: ComponentFixture<AdmindeclarationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdmindeclarationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdmindeclarationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
