import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { provideFirestore, getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { ActiveMembers } from './active-members';
import { firebaseTestConfig } from '../../../firebase-test.config';
import { MembershipService } from '../../../services/membership.service';
import { UserService } from '../../../services/user.service';

describe('ActiveMembers', () => {
  let component: ActiveMembers;
  let fixture: ComponentFixture<ActiveMembers>;
  let membershipService: MembershipService;
  let userService: UserService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveMembers],
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

    fixture = TestBed.createComponent(ActiveMembers);
    component = fixture.componentInstance;
    membershipService = TestBed.inject(MembershipService);
    userService = TestBed.inject(UserService);

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

  it('should have activeMembersWithUsers signal', () => {
    expect(component['activeMembersWithUsers']).toBeDefined();
    expect(Array.isArray(component['activeMembersWithUsers']())).toBe(true);
  });
});
