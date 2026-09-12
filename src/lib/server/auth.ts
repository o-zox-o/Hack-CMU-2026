/**
 * Passwords + sessions. No framework, ~60 lines, nothing to configure.
 *
 *   hashPassword / verifyPassword — scrypt with a per-user salt. Store the
 *     returned string in the user document; never the raw password.
 *   session cookie — "<userId>.<hmac>" signed with SESSION_SECRET so it can't
 *     be forged. Only the id lives in the cookie; the user is looked up per
 *     request in hooks.server.ts, so deleting a user logs them out.
 *
 * Set SESSION_SECRET in .env (see .env.example). The dev fallback below is
 * fine locally and must not ship.
 */

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

const SECRET = env.SESSION_SECRET ?? 'dev-only-secret-change-me';
export const SESSION_COOKIE = 'session';
const SESSION_DAYS = 30;

/* ---- passwords ---------------------------------------------------------- */

export function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync(password, salt, 64).toString('hex');
	return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	const [salt, hash] = stored.split(':');
	if (!salt || !hash) return false;
	const candidate = scryptSync(password, salt, 64);
	const expected = Buffer.from(hash, 'hex');
	return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/* ---- sessions ----------------------------------------------------------- */

function sign(userId: string): string {
	return createHmac('sha256', SECRET).update(userId).digest('base64url');
}

export function createSessionToken(userId: string): string {
	return `${userId}.${sign(userId)}`;
}

/** The user id inside a token, or null if the signature doesn't match. */
export function readSessionToken(token: string): string | null {
	const dot = token.lastIndexOf('.');
	if (dot < 1) return null;
	const userId = token.slice(0, dot);
	const given = Buffer.from(token.slice(dot + 1));
	const expected = Buffer.from(sign(userId));
	return given.length === expected.length && timingSafeEqual(given, expected) ? userId : null;
}

export function setSessionCookie(cookies: Cookies, userId: string): void {
	cookies.set(SESSION_COOKIE, createSessionToken(userId), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: SESSION_DAYS * 24 * 60 * 60
	});
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
