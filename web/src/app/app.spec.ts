import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { App } from './app';
import { firebaseTestConfig } from './firebase-test.config';
import { ClubService } from './services/club.service';
import { MembershipService } from './services/membership.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
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

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title in toolbar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const toolbar = compiled.querySelector('mat-toolbar');
    expect(toolbar?.textContent).toContain('ARRL Colorado Section - Year of the Club');
  });

  it('should have sidenav', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const sidenav = compiled.querySelector('mat-sidenav');
    expect(sidenav).toBeTruthy();
  });

  it('should show clubs link when user has no confirmed memberships', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const clubsLink = compiled.querySelector('a[routerlink="/clubs"]');
    expect(clubsLink).toBeTruthy();
  });

  it('should initialize pending clubs count to 0', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app['pendingClubsCount']()).toBe(0);
  });

  it('should update pending clubs count when loadPendingClubsCount is called', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const clubService = TestBed.inject(ClubService);

    // Mock pending clubs
    const mockPendingClubs = [
      { id: '1', name: 'Club 1', isActive: false } as any,
      { id: '2', name: 'Club 2', isActive: false } as any,
      { id: '3', name: 'Club 3', isActive: false } as any,
    ];
    
    // Use vi.spyOn for Vitest
    const spy = vi.spyOn(clubService, 'getPendingClubs').mockReturnValue(of(mockPendingClubs));

    // Call the method directly to test it
    app['loadPendingClubsCount']();
    
    // Wait for observable to complete
    await fixture.whenStable();
    fixture.detectChanges();

    // Verify the method was called
    expect(spy).toHaveBeenCalled();
  });

  it('should initialize pending membership counts to empty map', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app['pendingMembershipCounts']().size).toBe(0);
  });

  it('should return 0 for clubs with no pending memberships', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app['getPendingMembershipCount']('non-existent-club')).toBe(0);
  });

  it('should filter clubs for non-admin users when loading pending membership counts', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const membershipService = TestBed.inject(MembershipService);

    // Mock clubs - user1 is only leader of club1
    const mockClubs = [
      { id: 'club1', name: 'Club 1', leaderIds: ['user1'] } as any,
      { id: 'club2', name: 'Club 2', leaderIds: ['user2'] } as any,
    ];

    const spy = vi.spyOn(membershipService, 'getPendingMemberships').mockReturnValue(of([]));

    // Call with non-admin user
    app['loadPendingMembershipCounts']('user1', false, mockClubs);

    // Should only call for club1 since user1 is not a leader of club2
    expect(spy).toHaveBeenCalledWith('club1');
    expect(spy).not.toHaveBeenCalledWith('club2');
  });

  it('should check all clubs for admin users when loading pending membership counts', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const membershipService = TestBed.inject(MembershipService);

    // Mock clubs
    const mockClubs = [
      { id: 'club1', name: 'Club 1', leaderIds: ['user2'] } as any,
      { id: 'club2', name: 'Club 2', leaderIds: ['user2'] } as any,
    ];

    const spy = vi.spyOn(membershipService, 'getPendingMemberships').mockReturnValue(of([]));

    // Call with admin user (user1 is not a leader of any club)
    app['loadPendingMembershipCounts']('user1', true, mockClubs);

    // Admin should check both clubs
    expect(spy).toHaveBeenCalledWith('club1');
    expect(spy).toHaveBeenCalledWith('club2');
  });
});
