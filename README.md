# NestJs Jwt Authentication example with access token and refresh token - Integration and End-to-end tests included

This is an example of how to implement an authentication system in NestJs using passport.js, and json web tokens (JWT).

The integration test of the auth building blocks lives in `src/auth/test`; the
e2e tests are in the root `test` folder.

```bash
yarn test # run integration test
yarn test:e2e # run e2e tests
```

The code reflects what was explained in the video:

[![IMAGE ALT TEXT HERE](https://img.youtube.com/vi/uAKzFhE3rxU/0.jpg)](https://www.youtube.com/watch?v=uAKzFhE3rxU)

## Layout

Authentication is split in two: `src/auth` says *what* authentication is, and
`src/common` holds the factories that turn it into Nest artefacts. A second
authentication domain (admins, partners...) therefore costs one call instead of
a copy of the auth folder.

```
src/auth/                  the auth kernel
  config/                  createJwtAuthOptions(): strategy names, secret env vars, lifetimes
  services/                BaseAuthService (the whole flow), TokenService, HashingService
  strategies/              createAccessTokenStrategy() / createRefreshTokenStrategy()
  types/  dto/  utils/     Tokens, JwtPayload, AuthUser, AuthDto...
src/auth-user/             the default domain: its Prisma hooks and its module
src/common/
  modules/                 createAuthDomain(): assembles a whole domain
  guards/  controllers/    the factories it builds on, usable on their own
  decorators/              @Public(), @GetCurrentUser(), @GetCurrentUserId()
```

`BaseAuthService` carries signup / signin / logout / refresh; a subclass only
implements 5 persistence hooks.

```ts
// src/auth-user/auth.module.ts
export const userAuthDomain = createAuthDomain({
  authService: AuthService,
  path: 'auth',
  tag: 'auth',
});

export const AuthModule = userAuthDomain.module;
```

Each domain protects its own routes with its own guard, and
`userAuthDomain.accessGuard` is the one registered as `APP_GUARD` in
`app.module.ts`, so every other route of the app requires a user access token
unless it is marked `@Public()`.

### Adding a second domain

```ts
@Injectable()
export class AdminAuthService extends BaseAuthService {
  // createUser / findUserByEmail / findUserById
  // saveRefreshTokenHash / clearRefreshTokenHash
}

export const adminAuthDomain = createAuthDomain({
  authService: AdminAuthService,
  path: 'admin/auth',
  jwt: {
    accessTokenStrategyName: 'admin-jwt',
    refreshTokenStrategyName: 'admin-jwt-refresh',
    accessTokenSecretEnv: 'ADMIN_AT_SECRET',
    refreshTokenSecretEnv: 'ADMIN_RT_SECRET',
  },
});
```

Import `adminAuthDomain.module`, protect your own admin routes with
`adminAuthDomain.strictAccessGuard`, and that is it. A runnable version of this
example is checked in as `src/auth/test/multi-auth-domain.spec.ts`.
