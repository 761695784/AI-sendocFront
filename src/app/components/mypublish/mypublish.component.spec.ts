import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MypublishComponent } from './mypublish.component';

describe('MypublishComponent', () => {
  let component: MypublishComponent;
  let fixture: ComponentFixture<MypublishComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MypublishComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MypublishComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
