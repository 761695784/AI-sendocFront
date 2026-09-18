import { TestBed } from '@angular/core/testing';

import { FoundQrService } from './found-qr.service';

describe('FoundQrService', () => {
  let service: FoundQrService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FoundQrService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
