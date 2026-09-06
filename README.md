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

## Sessions

`Session` holds one row per signed in device, which is what makes several
sessions per user possible: `POST auth/logout` ends the current one,
`POST auth/logout/all` ends every one of them, `GET auth/sessions` lists them.

The refresh token itself is never stored. Its authenticity already comes from
the JWT signature; the row only carries `tokenId`, the `jti` of the refresh
token currently valid for that session. Rotating is a single conditional
`UPDATE ... WHERE id = ? AND tokenId = ?`, so two requests can never both
rotate the same session.

The one that loses that race falls into the **grace window** (`RT_GRACE`, 30s,
in `src/auth/auth.constants.ts`): its token is the session's `prevTokenId`, so
it gets a new access token and keeps the refresh token it already had. Without this, a front firing two
refreshes at once would sign the user out. Past the grace window a replayed
token is treated as leaked and the whole session is revoked.

## Configuration

`ConfigModule.forRoot()` in `app.module.ts` validates the whole environment at
boot (`src/config/env.validation.ts`): a missing `DATABASE_URL` or a secret
under 32 characters stops the startup instead of the first request that needs
it. Copy `.env.example` and generate the secrets with `openssl rand -hex 32`.

It is registered globally, so anything that needs a value simply injects
`ConfigService` and reads it:

```ts
constructor(config: ConfigService) {
	this.tokens = {
		accessTokenSecret: config.getOrThrow<string>('AT_SECRET'),
		// ...
	};
}
```

Only what changes from one deployment to the next lives in the environment:
the database, the port and the two secrets. The token lifetimes and the grace
window are a decision of the auth domain, so they are constants in
`src/auth/auth.constants.ts`; the CORS origins are a list at the top of
`src/main.ts`.

`AuthService` reads its two secrets once, in its constructor, and hands them
around as a `TokenOptions`: `TokenService` receives the secrets themselves and
never touches the environment, which is what keeps it free of any domain.

## Layout

`src/auth` holds one authentication domain, written plainly: no factory,
no abstract base class. `src/common` only holds what is domain agnostic and is
shared as is.

```
src/config/
  env.validation.ts        every variable the app reads, checked at boot
src/auth/                  the auth domain
  auth.constants.ts        strategy names, token lifetimes, grace window
  auth.controller.ts       signup / signin / logout / refresh / sessions
  auth.service.ts          the flow, on top of the Prisma `user` model
  session.service.ts       the `session` rows and their atomic rotation
  auth.service.spec.ts     its unit tests
  auth.module.ts           controller, services and both strategies
  dto/  guards/  strategies/
src/common/
  services/                HashingService, TokenService, provided globally
  types/                   Tokens, JwtPayload, RefreshTokenPayload
  decorators/              @Public(), @GetCurrentUser(), @GetCurrentUserId()
```

No module is `@Global()` apart from `ConfigModule`: `AuthModule` imports
`CommonModule` for `HashingService` and `TokenService`, and `PrismaModule` for
the database, so what a domain can reach is visible in its own `imports`.
`TokenService` takes the signing options as an argument, which keeps it free of
any domain.

`AccessTokenGuard` is registered as `APP_GUARD` in `app.module.ts`: every route
requires a valid access token unless it is marked `@Public()`. `auth/refresh` is
`@Public()` and carries `RefreshTokenGuard` instead, since it is reached with a
refresh token.

### Adding a second domain

Copy `src/auth` to, say, `src/auth-admin` and change four things:

1. `auth.constants.ts`: other passport names (`admin-jwt`, `admin-jwt-refresh`);
2. `auth.service.ts` and the two strategies: other secret variables
   (`ADMIN_AT_SECRET`, `ADMIN_RT_SECRET`), declared in
   `src/config/env.validation.ts` too;
3. `auth.service.ts`: the Prisma model the domain authenticates against, and
   its own session table;
4. `auth.controller.ts`: the route prefix and the Swagger tag.

Import the new module in `app.module.ts`. Its routes are protected by its own
`AccessTokenGuard`, which the globally registered one does not replace: mark
them `@Public()` and add `@UseGuards(AdminAccessTokenGuard)`, since the global
guard runs the user strategy and would reject an admin token.
