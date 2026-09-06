export type JwtPayload = {
	email: string;
	sub: number;
	sid: string;
};

export type RefreshTokenPayload = JwtPayload & {
	jti: string;
};

export type JwtPayloadWithRt = RefreshTokenPayload & {
	refreshToken: string;
};
