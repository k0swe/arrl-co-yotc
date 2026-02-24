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

  it('should have upcomingEvents computed signal', () => {
    const fixture = TestBed.createComponent(Events);
    const component = fixture.componentInstance;
    expect(component['upcomingEvents']).toBeDefined();
    expect(Array.isArray(component['upcomingEvents']())).toBe(true);
  });

  it('should have pastEvents computed signal', () => {
    const fixture = TestBed.createComponent(Events);
    const component = fixture.componentInstance;
    expect(component['pastEvents']).toBeDefined();
    expect(Array.isArray(component['pastEvents']())).toBe(true);
  });

  it('should correctly separate upcoming and past events', () => {
    const fixture = TestBed.createComponent(Events);
    const component = fixture.componentInstance;
    const futureDate = new Date(Date.now() + 86400000);
    const pastDate = new Date(Date.now() - 86400000);
    const baseEvent = {
      id: '1',
      clubId: 'c1',
      name: 'Test',
      description: '',
      startTime: pastDate,
      createdAt: pastDate,
      updatedAt: pastDate,
      createdBy: 'u1',
    };
    component['events'].set([
      { ...baseEvent, id: '1', endTime: futureDate },
      { ...baseEvent, id: '2', endTime: pastDate },
    ]);
    expect(component['upcomingEvents']().length).toBe(1);
    expect(component['upcomingEvents']()[0].id).toBe('1');
    expect(component['pastEvents']().length).toBe(1);
    expect(component['pastEvents']()[0].id).toBe('2');
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
