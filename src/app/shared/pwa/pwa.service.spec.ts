import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { PwaService } from './pwa.service';

describe('PwaService', () => {
  const versionUpdates = new Subject<{ type: string }>();
  let service: PwaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SwUpdate,
          useValue: { isEnabled: true, versionUpdates, unrecoverable: new Subject(), checkForUpdate: () => Promise.resolve(false), activateUpdate: () => Promise.resolve(true) },
        },
      ],
    });
    service = TestBed.inject(PwaService);
  });

  it('suit la connexion réseau', () => {
    window.dispatchEvent(new Event('offline'));
    expect(service.online()).toBe(false);
    window.dispatchEvent(new Event('online'));
    expect(service.online()).toBe(true);
  });

  it('signale une nouvelle version prête', () => {
    versionUpdates.next({ type: 'VERSION_DETECTED' });
    expect(service.updateReady()).toBe(false);
    versionUpdates.next({ type: 'VERSION_READY' });
    expect(service.updateReady()).toBe(true);
  });

  it("propose l'installation quand le navigateur le permet", () => {
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt: () => Promise.resolve(), userChoice: Promise.resolve({ outcome: 'accepted' }) });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(service.canInstall()).toBe(true);
  });
});
