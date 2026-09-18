import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LostdeclarationComponent } from './lostdeclaration.component';

describe('LostdeclarationComponent', () => {
  let component: LostdeclarationComponent;
  let fixture: ComponentFixture<LostdeclarationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LostdeclarationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LostdeclarationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
