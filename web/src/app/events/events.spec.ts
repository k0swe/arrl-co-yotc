import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { provideFirestore, getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { Events } from './events';
import { firebaseTestConfig } from '../firebase-test.config';

describe('Events', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Events],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        provideFirebaseApp(() => initializeApp(firebaseTestConfig)),
        provideAuth(() => {
          const auth = getAuth();
          connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
          return auth;
        }),
        provideFirestore(() => {
          const firestore = getFirestore();
          connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
          return firestore;
        }),
      ],
    }).compileComponents();
  });

  it('should create the events component', () => {
    const fixture = TestBed.createComponent(Events);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should have loading signal', () => {
    const fixture = TestBed.createComponent(Events);
    const component = fixture.componentInstance;
    expect(component['loading']).toBeDefined();
    expect(typeof component['loading']()).toBe('boolean');
  });

  it('should have events signal', () => {
    const fixture = TestBed.createComponent(Events);
    const component = fixture.componentInstance;
    expect(component['events']).toBeDefined();
    expect(Array.isArray(component['events']())).toBe(true);
  });

  it('should render header', async () => {
    const fixture = TestBed.createComponent(Events);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const header = compiled.querySelector('.page-header h1');
    expect(header).toBeTruthy();
    expect(header?.textContent).toContain('Events');
  });
});
