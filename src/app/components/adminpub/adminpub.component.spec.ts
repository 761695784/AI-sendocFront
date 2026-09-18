import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminpubComponent } from './adminpub.component';

describe('AdminpubComponent', () => {
  let component: AdminpubComponent;
  let fixture: ComponentFixture<AdminpubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminpubComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdminpubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
