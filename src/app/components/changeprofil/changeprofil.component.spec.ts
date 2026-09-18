import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeprofilComponent } from './changeprofil.component';

describe('ChangeprofilComponent', () => {
  let component: ChangeprofilComponent;
  let fixture: ComponentFixture<ChangeprofilComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangeprofilComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChangeprofilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
