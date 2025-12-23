import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { Clubs } from './clubs';
import { firebaseConfig } from '../firebase.config';

describe('Clubs', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Clubs],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        provideFirebaseApp(() => initializeApp(firebaseConfig)),
        provideAuth(() => getAuth()),
        provideFirestore(() => getFirestore())
      ]
    }).compileComponents();
  });

  it('should create the clubs component', () => {
    const fixture = TestBed.createComponent(Clubs);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should have loading signal', () => {
    const fixture = TestBed.createComponent(Clubs);
    const component = fixture.componentInstance;
    expect(component['loading']).toBeDefined();
    expect(typeof component['loading']()).toBe('boolean');
  });

  it('should have clubs signal', () => {
    const fixture = TestBed.createComponent(Clubs);
    const component = fixture.componentInstance;
    expect(component['clubs']).toBeDefined();
    expect(Array.isArray(component['clubs']())).toBe(true);
  });

  it('should have userMemberships signal', () => {
    const fixture = TestBed.createComponent(Clubs);
    const component = fixture.componentInstance;
    expect(component['userMemberships']).toBeDefined();
    expect(Array.isArray(component['userMemberships']())).toBe(true);
  });

  it('should have applyForMembership method', () => {
    const fixture = TestBed.createComponent(Clubs);
    const component = fixture.componentInstance;
    expect(component['applyForMembership']).toBeDefined();
    expect(typeof component['applyForMembership']).toBe('function');
  });

  it('should have canApply method', () => {
    const fixture = TestBed.createComponent(Clubs);
    const component = fixture.componentInstance;
    expect(component['canApply']).toBeDefined();
    expect(typeof component['canApply']).toBe('function');
  });

  it('should render header', async () => {
    const fixture = TestBed.createComponent(Clubs);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const header = compiled.querySelector('.clubs-header h1');
    expect(header).toBeTruthy();
    expect(header?.textContent).toContain('Colorado Amateur Radio Clubs');
  });
});
