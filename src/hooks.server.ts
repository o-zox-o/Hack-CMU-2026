import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, verifySessionToken } from '$lib/server/session.js';
import { findUserById } from '$lib/server/users.js';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;

	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		const payload = await verifySessionToken(token);
		if (payload) {
			event.locals.user = await findUserById(payload.userId);
		}
	}

	return resolve(event);
};
