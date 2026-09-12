import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getLogoutUrl } from '$lib/server/auth0.js';
import { SESSION_COOKIE } from '$lib/server/session.js';

export const GET: RequestHandler = ({ cookies }) => {
	cookies.delete(SESSION_COOKIE, { path: '/' });
	redirect(302, getLogoutUrl());
};
