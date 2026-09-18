import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsergetComponent } from './userget.component';

describe('UsergetComponent', () => {
  let component: UsergetComponent;
  let fixture: ComponentFixture<UsergetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsergetComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UsergetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
