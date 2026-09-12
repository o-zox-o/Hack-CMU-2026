/**
 * Holds a signup's details between "we emailed you a code" and "you typed it
 * back in" — an HMAC-signed, httpOnly cookie in the same style as the
 * session token in auth.ts. Never touches the database; expires in 15
 * minutes.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';
import type { SignupInput } from '$lib/types';

const SECRET = env.SESSION_SECRET ?? 'dev-only-secret-change-me';
export const PENDING_SIGNUP_COOKIE = 'pending_signup';
const TTL_MS = 15 * 60 * 1000;

interface PendingSignup extends SignupInput {
	exp: number;
}

function sign(payload: string): string {
	return createHmac('sha256', SECRET).update(payload).digest('base64url');
}

function encode(input: SignupInput): string {
	const payload: PendingSignup = { ...input, exp: Date.now() + TTL_MS };
	const json = Buffer.from(JSON.stringify(payload)).toString('base64url');
	return `${json}.${sign(json)}`;
}

function decode(token: string): SignupInput | null {
	const dot = token.lastIndexOf('.');
	if (dot < 1) return null;

	const json = token.slice(0, dot);
	const given = Buffer.from(token.slice(dot + 1));
	const expected = Buffer.from(sign(json));
	if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

	try {
		const payload: PendingSignup = JSON.parse(Buffer.from(json, 'base64url').toString());
		if (payload.exp < Date.now()) return null;
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { exp, ...input } = payload;
		return input;
	} catch {
		return null;
	}
}

export function setPendingSignupCookie(cookies: Cookies, input: SignupInput): void {
	cookies.set(PENDING_SIGNUP_COOKIE, encode(input), {
		path: '/login',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: TTL_MS / 1000
	});
}

export function readPendingSignupCookie(cookies: Cookies): SignupInput | null {
	const token = cookies.get(PENDING_SIGNUP_COOKIE);
	return token ? decode(token) : null;
}

export function clearPendingSignupCookie(cookies: Cookies): void {
	cookies.delete(PENDING_SIGNUP_COOKIE, { path: '/login' });
}
