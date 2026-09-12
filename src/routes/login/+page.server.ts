import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { dev } from '$app/environment';
import { setSessionCookie } from '$lib/server/auth';
import { createUser, DEMO_PASSWORD, verifyLogin } from '$lib/server/db';
import { validateLogin, validateSignup } from '$lib/validate';

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

	signup: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const result = validateSignup(form);
		const echo = {
			name: String(form.get('name') ?? ''),
			email: String(form.get('email') ?? ''),
			campus: String(form.get('campus') ?? '')
		};
		if (!result.ok) return fail(400, { mode: 'signup' as const, errors: result.errors, ...echo });

		const created = await createUser(result.value);
		if (!created.ok) {
			return fail(409, {
				mode: 'signup' as const,
				errors: { email: 'There is already an account with this email — log in instead.' },
				...echo
			});
		}

		setSessionCookie(cookies, created.user.id);
		redirect(303, safeNext(url.searchParams.get('next')));
	}
} satisfies Actions;
