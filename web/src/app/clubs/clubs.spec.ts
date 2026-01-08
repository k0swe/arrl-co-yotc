import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { provideFirestore, getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { Clubs } from './clubs';
import { firebaseTestConfig } from '../firebase-test.config';

describe('Clubs', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Clubs],
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
    const header = compiled.querySelector('.page-header h1');
    expect(header).toBeTruthy();
    expect(header?.textContent).toContain('Colorado Amateur Radio Clubs');
  });

  it('should have filterText signal', () => {
    const fixture = TestBed.createComponent(Clubs);
    const component = fixture.componentInstance;
    expect(component['filterText']).toBeDefined();
    expect(typeof component['filterText']()).toBe('string');
    expect(component['filterText']()).toBe('');
  });

  it('should have filteredClubs computed signal', () => {
    const fixture = TestBed.createComponent(Clubs);
    const component = fixture.componentInstance;
    expect(component['filteredClubs']).toBeDefined();
    expect(Array.isArray(component['filteredClubs']())).toBe(true);
  });

  it('should filter clubs by name', () => {
    const fixture = TestBed.createComponent(Clubs);
    const component = fixture.componentInstance;
    
    // Set up test data
    const testClubs = [
      { id: '1', name: 'Denver Radio Club', callsign: 'W0DRC', location: 'Denver, CO' },
      { id: '2', name: 'Boulder Amateur Radio Club', callsign: 'W0BRC', location: 'Boulder, CO' },
      { id: '3', name: 'Springs Radio Society', callsign: 'W0SRS', location: 'Colorado Springs, CO' },
    ] as any;
    
    component['clubs'].set(testClubs);
    
    // Test no filter
    expect(component['filteredClubs']().length).toBe(3);
    
    // Test filter by name
    component['filterText'].set('denver');
    expect(component['filteredClubs']().length).toBe(1);
    expect(component['filteredClubs']()[0].name).toBe('Denver Radio Club');
  });

  it('should filter clubs by callsign', () => {
    const fixture = TestBed.createComponent(Clubs);
    const component = fixture.componentInstance;
    
    const testClubs = [
      { id: '1', name: 'Denver Radio Club', callsign: 'W0DRC', location: 'Denver, CO' },
      { id: '2', name: 'Boulder Amateur Radio Club', callsign: 'W0BRC', location: 'Boulder, CO' },
    ] as any;
    
    component['clubs'].set(testClubs);
    
    component['filterText'].set('w0brc');
    expect(component['filteredClubs']().length).toBe(1);
    expect(component['filteredClubs']()[0].callsign).toBe('W0BRC');
  });

  it('should filter clubs by location', () => {
    const fixture = TestBed.createComponent(Clubs);
    const component = fixture.componentInstance;
    
    const testClubs = [
      { id: '1', name: 'Denver Radio Club', callsign: 'W0DRC', location: 'Denver, CO' },
      { id: '2', name: 'Boulder Amateur Radio Club', callsign: 'W0BRC', location: 'Boulder, CO' },
      { id: '3', name: 'Springs Radio Society', callsign: 'W0SRS', location: 'Colorado Springs, CO' },
    ] as any;
    
    component['clubs'].set(testClubs);
    
    component['filterText'].set('boulder');
    expect(component['filteredClubs']().length).toBe(1);
    expect(component['filteredClubs']()[0].location).toBe('Boulder, CO');
  });

  it('should be case-insensitive when filtering', () => {
    const fixture = TestBed.createComponent(Clubs);
    const component = fixture.componentInstance;
    
    const testClubs = [
      { id: '1', name: 'Denver Radio Club', callsign: 'W0DRC', location: 'Denver, CO' },
    ] as any;
    
    component['clubs'].set(testClubs);
    
    component['filterText'].set('DENVER');
    expect(component['filteredClubs']().length).toBe(1);
  });

  it('should return all clubs when filter is empty', () => {
    const fixture = TestBed.createComponent(Clubs);
    const component = fixture.componentInstance;
    
    const testClubs = [
      { id: '1', name: 'Denver Radio Club', callsign: 'W0DRC', location: 'Denver, CO' },
      { id: '2', name: 'Boulder Amateur Radio Club', callsign: 'W0BRC', location: 'Boulder, CO' },
    ] as any;
    
    component['clubs'].set(testClubs);
    
    component['filterText'].set('');
    expect(component['filteredClubs']().length).toBe(2);
  });

  it('should return empty array when no clubs match filter', () => {
    const fixture = TestBed.createComponent(Clubs);
    const component = fixture.componentInstance;
    
    const testClubs = [
      { id: '1', name: 'Denver Radio Club', callsign: 'W0DRC', location: 'Denver, CO' },
    ] as any;
    
    component['clubs'].set(testClubs);
    
    component['filterText'].set('nonexistent');
    expect(component['filteredClubs']().length).toBe(0);
  });
});
