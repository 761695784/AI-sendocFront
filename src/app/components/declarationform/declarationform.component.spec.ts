import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeclarationformComponent } from './declarationform.component';

describe('DeclarationformComponent', () => {
  let component: DeclarationformComponent;
  let fixture: ComponentFixture<DeclarationformComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeclarationformComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DeclarationformComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
