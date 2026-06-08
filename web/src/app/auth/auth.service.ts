import { inject, Injectable, signal } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { from, Observable } from 'rxjs';
import { authUser } from '../firebase-observables';
import { FIREBASE_AUTH } from '../firebase.tokens';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(FIREBASE_AUTH);
  private googleProvider = new GoogleAuthProvider();
  private facebookProvider = new FacebookAuthProvider();

  // Signal to track current user
  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = signal<boolean>(false);
  readonly isAdmin = signal<boolean>(false);

  constructor() {
    // Subscribe to auth state changes
    authUser(this.auth).subscribe((firebaseUser) => {
      this.currentUser.set(firebaseUser);
      this.isAuthenticated.set(!!firebaseUser);

      // Get custom claims from ID token
      if (firebaseUser) {
        firebaseUser
          .getIdTokenResult()
          .then((idTokenResult) => {
            this.isAdmin.set(!!idTokenResult.claims['admin']);
          })
          .catch(() => {
            this.isAdmin.set(false);
          });
      } else {
        this.isAdmin.set(false);
      }
    });
  }

  /**
   * Sign in with email and password
   */
  signInWithEmailAndPassword(email: string, password: string): Observable<void> {
    return from(signInWithEmailAndPassword(this.auth, email, password).then(() => {}));
  }

  /**
   * Sign in with Google popup
   */
  signInWithGoogle(): Observable<void> {
    return from(signInWithPopup(this.auth, this.googleProvider).then(() => {}));
  }

  /**
   * Sign in with Facebook popup
   */
  signInWithFacebook(): Observable<void> {
    return from(signInWithPopup(this.auth, this.facebookProvider).then(() => {}));
  }

  /**
   * Create a new user account with email and password
   */
  createUserWithEmailAndPassword(email: string, password: string): Observable<void> {
    return from(createUserWithEmailAndPassword(this.auth, email, password).then(() => {}));
  }

  /**
   * Send password reset email
   */
  sendPasswordResetEmail(email: string): Observable<void> {
    return from(sendPasswordResetEmail(this.auth, email));
  }

  /**
   * Sign out the current user
   */
  signOut(): Observable<void> {
    return from(signOut(this.auth));
  }
}
