# NestJs Jwt Authentication example with access token and refresh token - Unit and End-to-end tests included

This is an example of how to implement an authentication system in NestJs using passport.js, and json web tokens (JWT).

`AuthService` is covered by unit tests next to it (`src/auth/auth.service.spec.ts`,
no database needed); the e2e tests, which hit the real database, are in the root
`test` folder.

```bash
npm test # run unit tests
npm run test:e2e # run e2e tests
```

The code reflects what was explained in the video:

[![IMAGE ALT TEXT HERE](https://img.youtube.com/vi/uAKzFhE3rxU/0.jpg)](https://www.youtube.com/watch?v=uAKzFhE3rxU)

## Layout

`src/auth` holds one authentication domain, written plainly: no factory,
no abstract base class. `src/common` only holds what is domain agnostic and is
shared as is.

```
src/auth/                  the auth domain
  auth.constants.ts        strategy names, secret env vars, token lifetimes
  auth.controller.ts       signup / signin / logout / refresh
  auth.service.ts          the flow, on top of the Prisma `user` model
  auth.service.spec.ts     its unit tests
  auth.module.ts           controller, service and both strategies
  dto/  guards/  strategies/
src/common/
  services/                HashingService, TokenService, provided globally
  types/                   Tokens, JwtPayload, JwtPayloadWithRt
  decorators/              @Public(), @GetCurrentUser(), @GetCurrentUserId()
```

`CommonModule` is `@Global()`, so `HashingService` and `TokenService` are
injectable anywhere without importing anything. `TokenService.getTokens()` takes
the signing options as an argument, which keeps it free of any domain.

`AccessTokenGuard` is registered as `APP_GUARD` in `app.module.ts`: every route
requires a valid access token unless it is marked `@Public()`. `auth/refresh` is
`@Public()` and carries `RefreshTokenGuard` instead, since it is reached with a
refresh token.

### Adding a second domain

Copy `src/auth` to, say, `src/auth-admin` and change three things:

1. `auth.constants.ts`: other passport names (`admin-jwt`, `admin-jwt-refresh`)
   and other secret env vars (`ADMIN_AT_SECRET`, `ADMIN_RT_SECRET`);
2. `auth.service.ts`: the Prisma model the domain authenticates against;
3. `auth.controller.ts`: the route prefix and the Swagger tag.

Import the new module in `app.module.ts`. Its routes are protected by its own
`AccessTokenGuard`, which the globally registered one does not replace: mark
them `@Public()` and add `@UseGuards(AdminAccessTokenGuard)`, since the global
guard runs the user strategy and would reject an admin token.
