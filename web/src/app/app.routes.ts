import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { ForgotPassword } from './auth/forgot-password/forgot-password';
import { Clubs } from './clubs/clubs';
import { Admin } from './admin/admin';
import { adminGuard } from './auth/admin.guard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'clubs', component: Clubs },
  { path: 'admin', component: Admin, canActivate: [adminGuard] },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'forgot-password', component: ForgotPassword },
  { path: '**', redirectTo: '' },
];
