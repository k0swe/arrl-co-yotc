import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { Login } from './login';
import { firebaseConfig } from '../../firebase.config';

describe('Login', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        provideFirebaseApp(() => initializeApp(firebaseConfig)),
        provideAuth(() => getAuth())
      ]
    }).compileComponents();
  });

  it('should create the login component', () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should have a login form', () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    expect(component['loginForm']).toBeDefined();
  });

  it('should have email and password controls', () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    const form = component['loginForm'];
    expect(form.get('email')).toBeDefined();
    expect(form.get('password')).toBeDefined();
  });

  it('should require email', () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    const emailControl = component['loginForm'].get('email');
    emailControl?.setValue('');
    expect(emailControl?.hasError('required')).toBe(true);
  });

  it('should validate email format', () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    const emailControl = component['loginForm'].get('email');
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBe(true);
  });

  it('should require password', () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    const passwordControl = component['loginForm'].get('password');
    passwordControl?.setValue('');
    expect(passwordControl?.hasError('required')).toBe(true);
  });

  it('should validate password minimum length', () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    const passwordControl = component['loginForm'].get('password');
    passwordControl?.setValue('12345');
    expect(passwordControl?.hasError('minlength')).toBe(true);
  });

  it('should render Google sign-in button', async () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const googleButton = compiled.querySelector('.google-button');
    expect(googleButton).toBeTruthy();
  });
});
