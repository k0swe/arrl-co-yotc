import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Profile } from './profile';
import { AuthService } from '../auth/auth.service';
import { UserService } from '../services/user.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { signal } from '@angular/core';
import { of } from 'rxjs';

describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;
  let mockAuthService: any;
  let mockUserService: any;
  let mockRouter: any;
  let mockSnackBar: any;

  beforeEach(async () => {
    mockAuthService = {
      currentUser: signal(null),
      isAuthenticated: signal(false),
    };

    mockUserService = {
      getUser: () => of(null),
      saveUser: () => of(undefined),
    };

    mockRouter = {
      navigate: () => Promise.resolve(true),
    };

    mockSnackBar = {
      open: () => {},
    };

    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
        { provide: Router, useValue: mockRouter },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
