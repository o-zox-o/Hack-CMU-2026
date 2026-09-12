import { SignJWT, jwtVerify } from 'jose';
import { env } from '$env/dynamic/private';

export const SESSION_COOKIE = 'session';

interface SessionPayload {
	userId: string;
}

function getSecretKey() {
	const secret = env.SESSION_SECRET;
	if (!secret) throw new Error('SESSION_SECRET is not set');
	return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
	return new SignJWT({ ...payload })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('7d')
		.sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
	try {
		const { payload } = await jwtVerify<SessionPayload>(token, getSecretKey());
		return payload;
	} catch {
		return null;
	}
}
