/**
 * Everything that identifies this authentication domain. A second domain
 * (admins, partners...) is a copy of this folder with other names, other
 * secrets and another Prisma model.
 */
export const AT_STRATEGY = 'jwt';
export const RT_STRATEGY = 'jwt-refresh';

/** Token lifetimes, in seconds: 15 minutes and 7 days. */
export const AT_TTL = 15 * 60;
export const RT_TTL = 7 * 24 * 60 * 60;

/**
 * How long the refresh token that was just rotated out is still accepted, in
 * seconds, so that requests firing in parallel do not knock each other out.
 */
export const RT_GRACE = 30;
