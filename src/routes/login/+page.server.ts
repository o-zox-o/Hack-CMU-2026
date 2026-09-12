import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { dev } from '$app/environment';
import { setSessionCookie } from '$lib/server/auth';
import { createUser, DEMO_PASSWORD, verifyLogin } from '$lib/server/db';
import { validateLogin, validateSignup } from '$lib/validate';
import { isEligibleCollegeEmail } from '$lib/server/collegeEmail';
import { checkVerificationCode, startEmailVerification } from '$lib/server/verifyEmail';
import {
	clearPendingSignupCookie,
	readPendingSignupCookie,
	setPendingSignupCookie
} from '$lib/server/pendingSignup';

/** Only allow same-origin relative paths as a post-login destination. */
function safeNext(raw: string | null): string {
	return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

export const load = (({ url }) => {
	return {
		next: safeNext(url.searchParams.get('next')),
		mode: (url.searchParams.get('mode') === 'signup' ? 'signup' : 'login') as 'login' | 'signup',
		// Surfaced on the page so a teammate can get in without asking.
		demo: dev ? { email: 'mei@andrew.cmu.edu', password: DEMO_PASSWORD } : null
	};
}) satisfies PageServerLoad;

export const actions = {
	login: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const result = validateLogin(form);
		if (!result.ok)
			return fail(400, {
				mode: 'login' as const,
				errors: result.errors,
				email: String(form.get('email') ?? '')
			});

		const user = await verifyLogin(result.email, result.password);
		if (!user) {
			return fail(401, {
				mode: 'login' as const,
				errors: { form: "That email and password don't match." },
				email: result.email
			});
		}

		setSessionCookie(cookies, user.id);
		redirect(303, safeNext(url.searchParams.get('next')));
	},

	/** Validates the form, then emails a one-time code instead of creating the account yet. */
	signup: async ({ request, cookies }) => {
		const form = await request.formData();
		const result = validateSignup(form, isEligibleCollegeEmail);
		const echo = {
			name: String(form.get('name') ?? ''),
			email: String(form.get('email') ?? ''),
			campus: String(form.get('campus') ?? '')
		};
		if (!result.ok) return fail(400, { mode: 'signup' as const, errors: result.errors, ...echo });

		// Everyone verifies their address. A .edu one also gets into the edu
		// hub; anything else is a general account, which is still an account.
		const started = await startEmailVerification(result.value.email);
		if (!started.ok) {
			return fail(502, {
				mode: 'signup' as const,
				errors: { form: "Couldn't send a verification code. Try again in a moment." },
				...echo
			});
		}

		setPendingSignupCookie(cookies, result.value, started.codeHash);
		return {
			mode: 'signup' as const,
			step: 'verify' as const,
			email: result.value.email,
			accountType: result.value.accountType
		};
	},

	/** The one-time code from the signup email — creates the account once it checks out. */
	verifyCode: async ({ request, cookies, url }) => {
		const pending = readPendingSignupCookie(cookies);
		if (!pending) {
			return fail(400, {
				mode: 'signup' as const,
				errors: { form: 'That signup session expired. Please start again.' }
			});
		}

		const form = await request.formData();
		const code = String(form.get('code') ?? '').trim();
		if (!code) {
			return fail(400, {
				mode: 'signup' as const,
				step: 'verify' as const,
				email: pending.input.email,
				errors: { form: 'Enter the code we emailed you.' }
			});
		}

		const verified = await checkVerificationCode(pending.input.email, code, pending.codeHash);
		if (!verified) {
			return fail(400, {
				mode: 'signup' as const,
				step: 'verify' as const,
				email: pending.input.email,
				errors: { form: 'That code is wrong or expired. Check your email and try again.' }
			});
		}

		const created = await createUser(pending.input);
		clearPendingSignupCookie(cookies);
		if (!created.ok) {
			// Back to the signup form — the code-entry step has nowhere to show
			// an email-field error, and there's nothing left to verify anyway.
			return fail(409, {
				mode: 'signup' as const,
				// Back to the form: this error renders there, and on the verify
				// step it had nowhere to show. Their fix, kept.
				step: 'form' as const,
				errors: { email: 'There is already an account with this email. Log in instead.' },
				name: pending.input.name,
				email: pending.input.email,
				campus: pending.input.campus
			});
		}

		setSessionCookie(cookies, created.user.id);

		// Straight into onboarding; it hands back to `next` when they're done.
		const next = safeNext(url.searchParams.get('next'));
		redirect(303, next === '/' ? '/welcome' : `/welcome?next=${encodeURIComponent(next)}`);
	}
} satisfies Actions;
