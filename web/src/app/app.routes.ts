import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { ForgotPassword } from './auth/forgot-password/forgot-password';
import { Clubs } from './clubs/clubs';
import { ClubDetail } from './clubs/club-detail/club-detail';
import { Events } from './events/events';
import { Standings } from './standings/standings';
import { Admin } from './admin/admin';
import { Profile } from './profile/profile';
import { Upload } from './upload/upload';
import { authGuard } from './auth/auth.guard';
import { adminGuard } from './auth/admin.guard';
import { profileCompleteGuard } from './auth/profile-complete.guard';

export const routes: Routes = [
  { path: '', component: Home, canActivate: [profileCompleteGuard] },
  { path: 'clubs', component: Clubs, canActivate: [profileCompleteGuard] },
  { path: 'clubs/:slug', component: ClubDetail, canActivate: [profileCompleteGuard] },
  { path: 'events', component: Events, canActivate: [profileCompleteGuard] },
  { path: 'standings', component: Standings, canActivate: [profileCompleteGuard] },
  { path: 'upload', component: Upload, canActivate: [authGuard, profileCompleteGuard] },
  { path: 'admin', component: Admin, canActivate: [authGuard, profileCompleteGuard, adminGuard] },
  { path: 'profile', component: Profile, canActivate: [authGuard] },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'forgot-password', component: ForgotPassword },
  { path: '**', redirectTo: '' },
];
