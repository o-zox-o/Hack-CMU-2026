import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getAuthorizeUrl } from '$lib/server/auth0.js';

const STATE_COOKIE = 'auth_state';

export const GET: RequestHandler = ({ cookies }) => {
	const state = crypto.randomUUID();

	cookies.set(STATE_COOKIE, state, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 60 * 10
	});

	redirect(302, getAuthorizeUrl(state));
};
