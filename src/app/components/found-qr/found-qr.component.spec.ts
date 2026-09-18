import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FoundQrComponent } from './found-qr.component';

describe('FoundQrComponent', () => {
  let component: FoundQrComponent;
  let fixture: ComponentFixture<FoundQrComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundQrComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FoundQrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
