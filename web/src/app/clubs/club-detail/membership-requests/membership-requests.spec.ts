import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { provideFirestore, getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { MembershipRequests } from './membership-requests';
import { firebaseTestConfig } from '../../../firebase-test.config';
import { AuthService } from '../../../auth/auth.service';
import { MembershipService } from '../../../services/membership.service';
import { UserService } from '../../../services/user.service';

describe('MembershipRequests', () => {
  let component: MembershipRequests;
  let fixture: ComponentFixture<MembershipRequests>;
  let membershipService: MembershipService;
  let userService: UserService;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembershipRequests],
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

    fixture = TestBed.createComponent(MembershipRequests);
    component = fixture.componentInstance;
    membershipService = TestBed.inject(MembershipService);
    userService = TestBed.inject(UserService);
    authService = TestBed.inject(AuthService);

    // Set a default clubId
    fixture.componentRef.setInput('clubId', 'test-club-id');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have clubId input', () => {
    expect(component.clubId()).toBe('test-club-id');
  });

  it('should have loading signal', () => {
    expect(component['loading']).toBeDefined();
    expect(typeof component['loading']()).toBe('boolean');
  });

  it('should have pendingMembershipsWithUsers signal', () => {
    expect(component['pendingMembershipsWithUsers']).toBeDefined();
    expect(Array.isArray(component['pendingMembershipsWithUsers']())).toBe(true);
  });

  it('should have processingMembership signal', () => {
    expect(component['processingMembership']).toBeDefined();
  });

  it('should have approveMembership method', () => {
    expect(component['approveMembership']).toBeDefined();
    expect(typeof component['approveMembership']).toBe('function');
  });

  it('should have denyMembership method', () => {
    expect(component['denyMembership']).toBeDefined();
    expect(typeof component['denyMembership']).toBe('function');
  });

  it('should have isProcessing method', () => {
    expect(component['isProcessing']).toBeDefined();
    expect(typeof component['isProcessing']).toBe('function');
  });
});
