import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { provideFirestore, getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { ClubDetail } from './club-detail';
import { firebaseTestConfig } from '../../firebase-test.config';
import { AuthService } from '../../auth/auth.service';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';

describe('ClubDetail', () => {
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClubDetail],
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

    authService = TestBed.inject(AuthService);
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ClubDetail);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should not allow editing when no club is loaded', () => {
    const fixture = TestBed.createComponent(ClubDetail);
    const component = fixture.componentInstance;
    expect(component['canEdit']()).toBe(false);
  });

  it('should allow editing when user is admin', () => {
    const fixture = TestBed.createComponent(ClubDetail);
    const component = fixture.componentInstance;

    // Set up an admin user
    authService.isAdmin.set(true);
    authService.currentUser.set({ uid: 'test-user-id' } as any);

    // Set up a club
    const testClub: Club = {
      id: 'test-club-id',
      name: 'Test Club',
      description: 'Test description',
      callsign: 'W0TEST',
      location: 'Test Location',
      slug: 'test-club',
      isActive: true,
      leaderIds: ['other-user-id'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    component['club'].set(testClub);

    expect(component['canEdit']()).toBe(true);
  });

  it('should allow editing when user is a club leader', () => {
    const fixture = TestBed.createComponent(ClubDetail);
    const component = fixture.componentInstance;

    // Set up a regular user (not admin)
    authService.isAdmin.set(false);
    authService.currentUser.set({ uid: 'test-user-id' } as any);

    // Set up a club where the user is a leader
    const testClub: Club = {
      id: 'test-club-id',
      name: 'Test Club',
      description: 'Test description',
      callsign: 'W0TEST',
      location: 'Test Location',
      slug: 'test-club',
      isActive: true,
      leaderIds: ['test-user-id'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    component['club'].set(testClub);

    expect(component['canEdit']()).toBe(true);
  });

  it('should not allow editing when user is not admin or club leader', () => {
    const fixture = TestBed.createComponent(ClubDetail);
    const component = fixture.componentInstance;

    // Set up a regular user (not admin)
    authService.isAdmin.set(false);
    authService.currentUser.set({ uid: 'test-user-id' } as any);

    // Set up a club where the user is NOT a leader
    const testClub: Club = {
      id: 'test-club-id',
      name: 'Test Club',
      description: 'Test description',
      callsign: 'W0TEST',
      location: 'Test Location',
      slug: 'test-club',
      isActive: true,
      leaderIds: ['other-user-id'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    component['club'].set(testClub);

    expect(component['canEdit']()).toBe(false);
  });

  it('should not allow editing when user is not logged in', () => {
    const fixture = TestBed.createComponent(ClubDetail);
    const component = fixture.componentInstance;

    // Set up no user
    authService.isAdmin.set(false);
    authService.currentUser.set(null);

    // Set up a club
    const testClub: Club = {
      id: 'test-club-id',
      name: 'Test Club',
      description: 'Test description',
      callsign: 'W0TEST',
      location: 'Test Location',
      slug: 'test-club',
      isActive: true,
      leaderIds: ['other-user-id'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    component['club'].set(testClub);

    expect(component['canEdit']()).toBe(false);
  });
});
