import { authGuard } from './auth/auth.guard';
import { adminGuard } from './auth/admin.guard';
import { profileCompleteGuard } from './auth/profile-complete.guard';
import { routes } from './app.routes';

const findRoute = (path: string) => {
  const route = routes.find((candidate) => candidate.path === path);
  expect(route).toBeDefined();
  return route!;
};

describe('routes', () => {
  it('lazy loads feature components', async () => {
    const expectedComponents = new Map<string, () => Promise<unknown>>([
      ['', async () => (await import('./home/home')).Home],
      ['clubs', async () => (await import('./clubs/clubs')).Clubs],
      ['clubs/:slug', async () => (await import('./clubs/club-detail/club-detail')).ClubDetail],
      ['events', async () => (await import('./events/events')).Events],
      ['standings', async () => (await import('./standings/standings')).Standings],
      ['upload', async () => (await import('./upload/upload')).Upload],
      ['admin', async () => (await import('./admin/admin')).Admin],
      ['profile', async () => (await import('./profile/profile')).Profile],
      ['login', async () => (await import('./auth/login/login')).Login],
      ['register', async () => (await import('./auth/register/register')).Register],
      ['forgot-password', async () => (await import('./auth/forgot-password/forgot-password')).ForgotPassword],
    ]);

    for (const [path, expectedComponent] of expectedComponents) {
      const route = findRoute(path);
      expect(route.component).toBeUndefined();
      expect(route.loadComponent).toBeDefined();

      const component = await route.loadComponent!();
      expect(component).toBe(await expectedComponent());
    }
  });

  it('preserves existing route guards and redirect behavior', () => {
    expect(findRoute('').canActivate).toEqual([profileCompleteGuard]);
    expect(findRoute('clubs').canActivate).toEqual([profileCompleteGuard]);
    expect(findRoute('clubs/:slug').canActivate).toEqual([profileCompleteGuard]);
    expect(findRoute('events').canActivate).toEqual([profileCompleteGuard]);
    expect(findRoute('standings').canActivate).toEqual([profileCompleteGuard]);
    expect(findRoute('upload').canActivate).toEqual([authGuard, profileCompleteGuard]);
    expect(findRoute('admin').canActivate).toEqual([authGuard, profileCompleteGuard, adminGuard]);
    expect(findRoute('profile').canActivate).toEqual([authGuard]);
    expect(findRoute('login').canActivate).toBeUndefined();
    expect(findRoute('register').canActivate).toBeUndefined();
    expect(findRoute('forgot-password').canActivate).toBeUndefined();

    const wildcardRoute = findRoute('**');
    expect(wildcardRoute.redirectTo).toBe('');
  });
});
