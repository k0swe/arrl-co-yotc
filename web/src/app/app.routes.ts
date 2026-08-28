import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { adminGuard } from './auth/admin.guard';
import { profileCompleteGuard } from './auth/profile-complete.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home').then((m) => m.Home),
    canActivate: [profileCompleteGuard],
  },
  {
    path: 'clubs',
    loadComponent: () => import('./clubs/clubs').then((m) => m.Clubs),
    canActivate: [profileCompleteGuard],
  },
  {
    path: 'clubs/:slug',
    loadComponent: () => import('./clubs/club-detail/club-detail').then((m) => m.ClubDetail),
    canActivate: [profileCompleteGuard],
  },
  {
    path: 'events',
    loadComponent: () => import('./events/events').then((m) => m.Events),
    canActivate: [profileCompleteGuard],
  },
  {
    path: 'standings',
    loadComponent: () => import('./standings/standings').then((m) => m.Standings),
    canActivate: [profileCompleteGuard],
  },
  {
    path: 'upload',
    loadComponent: () => import('./upload/upload').then((m) => m.Upload),
    canActivate: [authGuard, profileCompleteGuard],
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin').then((m) => m.Admin),
    canActivate: [authGuard, profileCompleteGuard, adminGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile').then((m) => m.Profile),
    canActivate: [authGuard],
  },
  { path: 'login', loadComponent: () => import('./auth/login/login').then((m) => m.Login) },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register').then((m) => m.Register),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  { path: '**', redirectTo: '' },
];
