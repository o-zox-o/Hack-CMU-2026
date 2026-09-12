import { json, redirect, type Handle } from '@sveltejs/kit';
import { readSessionToken, SESSION_COOKIE } from '$lib/server/auth';
import { getUser } from '$lib/server/db';
import { campusLocation, LOCATION_COOKIE, parseLatLng } from '$lib/geo';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	const userId = token ? readSessionToken(token) : null;
	const user = userId ? await getUser(userId) : null;

	const path = event.url.pathname;
	const isLoginPage = path === '/login';

	if (!user) {
		if (path.startsWith('/api/')) {
			return json({ error: 'unauthorized' }, { status: 401 });
		}

		if (!isLoginPage) {
			const next = event.url.pathname + event.url.search;
			redirect(303, next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`);
		}
	} else if (isLoginPage) {
		redirect(303, '/');
	}

	// /login is the only page where user can be null.
	event.locals.user = user!;

	const gps = parseLatLng(event.cookies.get(LOCATION_COOKIE));

	if (gps) {
		event.locals.location = gps;
		event.locals.locationSource = 'gps';
	} else if (user) {
		event.locals.location = campusLocation(user.campus);
		event.locals.locationSource = 'campus';
	}

	return resolve(event);
};