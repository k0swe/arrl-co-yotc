import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { provideFirestore, getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { Members } from './members';
import { firebaseTestConfig } from '../../../firebase-test.config';
import { MembershipService } from '../../../services/membership.service';
import { UserService } from '../../../services/user.service';
import { ClubService } from '../../../services/club.service';
import { AuthService } from '../../../auth/auth.service';

describe('Members', () => {
  let component: Members;
  let fixture: ComponentFixture<Members>;
  let membershipService: MembershipService;
  let userService: UserService;
  let clubService: ClubService;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Members],
      providers: [
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

    fixture = TestBed.createComponent(Members);
    component = fixture.componentInstance;
    membershipService = TestBed.inject(MembershipService);
    userService = TestBed.inject(UserService);
    clubService = TestBed.inject(ClubService);
    authService = TestBed.inject(AuthService);

    // Set default inputs
    fixture.componentRef.setInput('clubId', 'test-club-id');
    fixture.componentRef.setInput('clubLeaderIds', []);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have clubId input', () => {
    expect(component.clubId()).toBe('test-club-id');
  });

  it('should have clubLeaderIds input', () => {
    expect(component.clubLeaderIds()).toEqual([]);
  });

  it('should have loading signal', () => {
    expect(component['loading']).toBeDefined();
    expect(typeof component['loading']()).toBe('boolean');
  });

  it('should have activeMembersWithUsers signal', () => {
    expect(component['activeMembersWithUsers']).toBeDefined();
    expect(Array.isArray(component['activeMembersWithUsers']())).toBe(true);
  });

  it('should have pendingMembershipsWithUsers signal', () => {
    expect(component['pendingMembershipsWithUsers']).toBeDefined();
    expect(Array.isArray(component['pendingMembershipsWithUsers']())).toBe(true);
  });

  it('should have canManageRoles computed signal', () => {
    expect(component['canManageRoles']).toBeDefined();
    expect(typeof component['canManageRoles']()).toBe('boolean');
  });

  it('should have canApproveMemberships computed signal', () => {
    expect(component['canApproveMemberships']).toBeDefined();
    expect(typeof component['canApproveMemberships']()).toBe('boolean');
  });

  it('should allow admins to manage roles', () => {
    authService.isAdmin.set(true);
    expect(component['canManageRoles']()).toBe(true);
  });

  it('should not allow non-admins to manage roles', () => {
    authService.isAdmin.set(false);
    expect(component['canManageRoles']()).toBe(false);
  });

  it('should allow admins to approve memberships', () => {
    authService.isAdmin.set(true);
    authService.currentUser.set({ uid: 'test-user-id' } as any);
    expect(component['canApproveMemberships']()).toBe(true);
  });

  it('should allow club leaders to approve memberships', () => {
    authService.isAdmin.set(false);
    authService.currentUser.set({ uid: 'test-user-id' } as any);
    fixture.componentRef.setInput('clubLeaderIds', ['test-user-id']);
    expect(component['canApproveMemberships']()).toBe(true);
  });

  it('should not allow non-leaders/non-admins to approve memberships', () => {
    authService.isAdmin.set(false);
    authService.currentUser.set({ uid: 'test-user-id' } as any);
    fixture.componentRef.setInput('clubLeaderIds', ['other-user-id']);
    expect(component['canApproveMemberships']()).toBe(false);
  });

  it('should not allow unauthenticated users to approve memberships', () => {
    authService.isAdmin.set(false);
    authService.currentUser.set(null);
    expect(component['canApproveMemberships']()).toBe(false);
  });

  it('should handle undefined clubLeaderIds when checking if user can approve memberships', () => {
    authService.isAdmin.set(false);
    authService.currentUser.set({ uid: 'test-user-id' } as any);
    fixture.componentRef.setInput('clubLeaderIds', undefined);
    expect(component['canApproveMemberships']()).toBe(false);
  });

  it('should handle undefined clubLeaderIds when promoting to leader', () => {
    authService.isAdmin.set(true);
    fixture.componentRef.setInput('clubId', 'test-club-id');
    fixture.componentRef.setInput('clubLeaderIds', undefined);

    // This should not throw an error
    expect(() => {
      component['promoteToLeader']('user-123', 'Test User');
    }).not.toThrow();
  });

  it('should handle undefined clubLeaderIds when demoting to member', () => {
    authService.isAdmin.set(true);
    fixture.componentRef.setInput('clubId', 'test-club-id');
    fixture.componentRef.setInput('clubLeaderIds', undefined);

    // This should not throw an error
    expect(() => {
      component['demoteToMember']('user-123', 'Test User');
    }).not.toThrow();
  });
});
