import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoogleauthComponent } from './googleauth.component';

describe('GoogleauthComponent', () => {
  let component: GoogleauthComponent;
  let fixture: ComponentFixture<GoogleauthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoogleauthComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GoogleauthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
