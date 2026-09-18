import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SideheadersComponent } from './sideheaders.component';

describe('SideheadersComponent', () => {
  let component: SideheadersComponent;
  let fixture: ComponentFixture<SideheadersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SideheadersComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SideheadersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
