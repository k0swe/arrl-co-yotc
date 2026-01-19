import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { SidenavComponent } from './sidenav';
import { firebaseTestConfig } from '../firebase-test.config';
import { ClubService } from '../services/club.service';
import { MembershipService } from '../services/membership.service';
import { MembershipStatus } from '@arrl-co-yotc/shared/build/app/models/user.model';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('SidenavComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidenavComponent],
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

  it('should create the component', () => {
    const fixture = TestBed.createComponent(SidenavComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should initialize pending clubs count to 0', () => {
    const fixture = TestBed.createComponent(SidenavComponent);
    const component = fixture.componentInstance;
    expect(component['pendingClubsCount']()).toBe(0);
  });

  it('should update pending clubs count when loadPendingClubsCount is called', async () => {
    const fixture = TestBed.createComponent(SidenavComponent);
    const component = fixture.componentInstance;
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
    component['loadPendingClubsCount']();

    // Wait for observable to complete
    await fixture.whenStable();
    fixture.detectChanges();

    // Verify the method was called
    expect(spy).toHaveBeenCalled();
  });

  it('should initialize pending membership counts to empty map', () => {
    const fixture = TestBed.createComponent(SidenavComponent);
    const component = fixture.componentInstance;
    expect(component['pendingMembershipCounts']().size).toBe(0);
  });

  it('should initialize clubsExpanded to false', () => {
    const fixture = TestBed.createComponent(SidenavComponent);
    const component = fixture.componentInstance;
    expect(component['clubsExpanded']()).toBe(false);
  });

  it('should return 0 for clubs with no pending memberships', () => {
    const fixture = TestBed.createComponent(SidenavComponent);
    const component = fixture.componentInstance;
    expect(component['getPendingMembershipCount']('non-existent-club')).toBe(0);
  });

  it('should filter clubs for non-admin users when loading pending membership counts', () => {
    const fixture = TestBed.createComponent(SidenavComponent);
    const component = fixture.componentInstance;
    const membershipService = TestBed.inject(MembershipService);

    // Mock clubs - user1 is only leader of club1
    const mockClubs = [
      { id: 'club1', name: 'Club 1', leaderIds: ['user1'] } as any,
      { id: 'club2', name: 'Club 2', leaderIds: ['user2'] } as any,
    ];

    const spy = vi.spyOn(membershipService, 'getPendingMemberships').mockReturnValue(of([]));

    // Call with non-admin user
    component['loadPendingMembershipCounts']('user1', false, mockClubs);

    // Should only call for club1 since user1 is not a leader of club2
    expect(spy).toHaveBeenCalledWith('club1');
    expect(spy).not.toHaveBeenCalledWith('club2');
  });

  it('should check all clubs for admin users when loading pending membership counts', () => {
    const fixture = TestBed.createComponent(SidenavComponent);
    const component = fixture.componentInstance;
    const membershipService = TestBed.inject(MembershipService);

    // Mock clubs
    const mockClubs = [
      { id: 'club1', name: 'Club 1', leaderIds: ['user2'] } as any,
      { id: 'club2', name: 'Club 2', leaderIds: ['user2'] } as any,
    ];

    const spy = vi.spyOn(membershipService, 'getPendingMemberships').mockReturnValue(of([]));

    // Call with admin user (user1 is not a leader of any club)
    component['loadPendingMembershipCounts']('user1', true, mockClubs);

    // Admin should check both clubs
    expect(spy).toHaveBeenCalledWith('club1');
    expect(spy).toHaveBeenCalledWith('club2');
  });

  it('should have bug reports and feature requests link', async () => {
    const fixture = TestBed.createComponent(SidenavComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const bugReportLink = compiled.querySelector(
      'a[href="https://github.com/k0swe/arrl-co-yotc/issues"]',
    );
    expect(bugReportLink).toBeTruthy();
    expect(bugReportLink?.getAttribute('target')).toBe('_blank');
    expect(bugReportLink?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(bugReportLink?.textContent).toContain('Bug reports and feature requests');
  });

  it('should have event merchandise link', async () => {
    const fixture = TestBed.createComponent(SidenavComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const merchandiseLink = compiled.querySelector(
      'a[href="https://colorado-arrl.creator-spring.com/"]',
    );
    expect(merchandiseLink).toBeTruthy();
    expect(merchandiseLink?.getAttribute('target')).toBe('_blank');
    expect(merchandiseLink?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(merchandiseLink?.textContent).toContain('Event Merchandise');
  });

  it('should show clubs link when user has no confirmed memberships', async () => {
    const fixture = TestBed.createComponent(SidenavComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const clubsLink = compiled.querySelector('a[routerlink="/clubs"]');
    expect(clubsLink).toBeTruthy();
  });

  it('should emit navItemClick when onNavItemClick is called', () => {
    const fixture = TestBed.createComponent(SidenavComponent);
    const component = fixture.componentInstance;

    let emitted = false;
    component.navItemClick.subscribe(() => {
      emitted = true;
    });

    component['onNavItemClick']();
    expect(emitted).toBe(true);
  });

  it('should set clubsExpanded to true when clubs are loaded for admin', async () => {
    const fixture = TestBed.createComponent(SidenavComponent);
    const component = fixture.componentInstance;
    const clubService = TestBed.inject(ClubService);

    // Mock clubs
    const mockClubs = [
      { id: 'club1', name: 'Club 1', isActive: true } as any,
      { id: 'club2', name: 'Club 2', isActive: true } as any,
    ];

    vi.spyOn(clubService, 'getActiveClubs').mockReturnValue(of(mockClubs));

    // Simulate loading clubs as admin
    component['loadUserClubs']('user1', true);

    // Wait for observable to complete
    await fixture.whenStable();
    fixture.detectChanges();

    // Verify clubsExpanded is set to true
    expect(component['clubsExpanded']()).toBe(true);
  });

  it('should set clubsExpanded to true when clubs are loaded for regular user', async () => {
    const fixture = TestBed.createComponent(SidenavComponent);
    const component = fixture.componentInstance;
    const clubService = TestBed.inject(ClubService);
    const membershipService = TestBed.inject(MembershipService);

    // Mock memberships and clubs
    const mockMemberships = [{ clubId: 'club1', status: 'active' as MembershipStatus }];
    const mockClubs = [{ id: 'club1', name: 'Club 1', isActive: true } as any];

    vi.spyOn(membershipService, 'getUserMemberships').mockReturnValue(of(mockMemberships as any));
    vi.spyOn(clubService, 'getActiveClubs').mockReturnValue(of(mockClubs));

    // Simulate loading clubs as regular user
    component['loadUserClubs']('user1', false);

    // Wait for observable to complete
    await fixture.whenStable();
    fixture.detectChanges();

    // Verify clubsExpanded is set to true
    expect(component['clubsExpanded']()).toBe(true);
  });
});
