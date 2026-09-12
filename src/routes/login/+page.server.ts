import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { dev } from '$app/environment';
import { setSessionCookie } from '$lib/server/auth';
import { createUser, DEMO_PASSWORD, verifyLogin } from '$lib/server/db';
import { validateLogin, validateSignup } from '$lib/validate';
import { isEligibleCollegeEmail } from '$lib/server/collegeEmail';
import { startPasswordlessEmail, verifyPasswordlessCode } from '$lib/server/auth0';
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
		const result = validateSignup(form);
		const echo = {
			name: String(form.get('name') ?? ''),
			email: String(form.get('email') ?? ''),
			campus: String(form.get('campus') ?? '')
		};
		if (!result.ok) return fail(400, { mode: 'signup' as const, errors: result.errors, ...echo });

		// Our own check — authoritative regardless of what's configured in Auth0.
		if (!isEligibleCollegeEmail(result.value.email)) {
			return fail(400, {
				mode: 'signup' as const,
				errors: { email: 'Sign up with your .edu email address.' },
				...echo
			});
		}

		try {
			await startPasswordlessEmail(result.value.email);
		} catch {
			return fail(502, {
				mode: 'signup' as const,
				errors: { form: "Couldn't send a verification code — try again in a moment." },
				...echo
			});
		}

		setPendingSignupCookie(cookies, result.value);
		return { mode: 'signup' as const, step: 'verify' as const, email: result.value.email };
	},

	/** The one-time code from the signup email — creates the account once it checks out. */
	verifyCode: async ({ request, cookies, url }) => {
		const pending = readPendingSignupCookie(cookies);
		if (!pending) {
			return fail(400, {
				mode: 'signup' as const,
				errors: { form: 'That signup session expired — please start again.' }
			});
		}

		const form = await request.formData();
		const code = String(form.get('code') ?? '').trim();
		if (!code) {
			return fail(400, {
				mode: 'signup' as const,
				step: 'verify' as const,
				email: pending.email,
				errors: { form: 'Enter the code we emailed you.' }
			});
		}

		const verified = await verifyPasswordlessCode(pending.email, code);
		if (!verified) {
			return fail(400, {
				mode: 'signup' as const,
				step: 'verify' as const,
				email: pending.email,
				errors: { form: 'That code is wrong or expired — check your email and try again.' }
			});
		}

		const created = await createUser(pending);
		clearPendingSignupCookie(cookies);
		if (!created.ok) {
			return fail(409, {
				mode: 'signup' as const,
				errors: { email: 'There is already an account with this email — log in instead.' },
				name: pending.name,
				email: pending.email,
				campus: pending.campus
			});
		}

		setSessionCookie(cookies, created.user.id);

		// Straight into onboarding; it hands back to `next` when they're done.
		const next = safeNext(url.searchParams.get('next'));
		redirect(303, next === '/' ? '/welcome' : `/welcome?next=${encodeURIComponent(next)}`);
	}
} satisfies Actions;
