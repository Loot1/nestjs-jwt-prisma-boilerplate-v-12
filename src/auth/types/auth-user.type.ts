/**
 * Minimal shape an authenticable entity must expose.
 * Any Prisma model with these columns can be plugged into `BaseAuthService`.
 */
export type AuthUser = {
	id: number;
	email: string;
	hash: string;
	hashedRt: string | null;
};

/** Credentials accepted by the local sign-up / sign-in flows. */
export type AuthCredentials = {
	email: string;
	password: string;
};
