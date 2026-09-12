/**
 * Proving a signup's .edu address is real and reachable.
 *
 * Two ways to do it, and the caller doesn't care which ran:
 *
 *   Auth0 Passwordless  — used when AUTH0_* is configured. Auth0 owns the
 *                         code; we hand it back for checking.
 *   Our own code        — a 6-digit number we generate and email through
 *                         Resend, the same channel as every other email.
 *
 * The local path is the fallback, not a second-class citizen: it's what runs
 * with no Auth0 tenant set up, and it's what catches a tenant that's
 * configured but refusing (a disabled connection, a bad secret). Signup must
 * not be a dead end just because a third party isn't wired in yet.
 *
 * A local code never touches the database. We keep an HMAC of it in the
 * signed, httpOnly pending-signup cookie and compare hashes — so the code
 * itself only ever exists in the email and in the user's head.
 */

import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { startPasswordlessEmail, verifyPasswordlessCode } from './auth0';
import { sendVerificationCode } from './email';

const SECRET = env.SESSION_SECRET ?? 'dev-only-secret-change-me';

/** All three, or we can't talk to Auth0 at all. */
function auth0Configured(): boolean {
	return Boolean(env.AUTH0_DOMAIN && env.AUTH0_CLIENT_ID && env.AUTH0_CLIENT_SECRET);
}

/** Tied to the address, so a code for one email can't be replayed for another. */
export function hashCode(email: string, code: string): string {
	return createHmac('sha256', SECRET).update(`${email.toLowerCase()}:${code}`).digest('base64url');
}

/**
 * Sent by Auth0, or by us. `codeHash` is set only on the local path — it's
 * what the pending-signup cookie has to carry to check the answer later.
 */
export type VerificationStart = { ok: true; codeHash?: string } | { ok: false };

export async function startEmailVerification(email: string): Promise<VerificationStart> {
	if (auth0Configured()) {
		try {
			await startPasswordlessEmail(email);
			return { ok: true };
		} catch (err) {
			// Configured but unhappy. Don't strand the signup — send our own.
			console.error('[verify] Auth0 refused, falling back to our own code:', err);
		}
	}

	const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
	const sent = await sendVerificationCode(email, code);

	// No Resend key in local dev, so the code has nowhere to go but the log —
	// which is exactly how email.ts already behaves for every other message.
	if (!sent.ok) {
		if (!dev) {
			console.error(`[verify] could not email a code to ${email}: ${sent.reason}`);
			return { ok: false };
		}
		console.log(`[verify] DEV — no email configured. Code for ${email} is ${code}`);
	}

	return { ok: true, codeHash: hashCode(email, code) };
}

/**
 * Check what they typed. `codeHash` present means we issued the code
 * ourselves; absent means Auth0 did and only Auth0 can say.
 */
export async function checkVerificationCode(
	email: string,
	code: string,
	codeHash?: string
): Promise<boolean> {
	if (!codeHash) return verifyPasswordlessCode(email, code);

	const given = Buffer.from(hashCode(email, code));
	const expected = Buffer.from(codeHash);
	return given.length === expected.length && timingSafeEqual(given, expected);
}
