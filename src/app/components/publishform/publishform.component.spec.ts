import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublishformComponent } from './publishform.component';

describe('PublishformComponent', () => {
  let component: PublishformComponent;
  let fixture: ComponentFixture<PublishformComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublishformComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PublishformComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
