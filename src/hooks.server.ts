import { json, redirect, type Handle } from '@sveltejs/kit';
import { readSessionToken, SESSION_COOKIE } from '$lib/server/auth';
import { getUser } from '$lib/server/db';
import { campusLocation, LOCATION_COOKIE, parseLatLng } from '$lib/geo';

/**
 * Resolve the session cookie to a user on every request.
 *
 *   signed in  -> locals.user is set; /login bounces to the feed
 *   signed out -> API routes get a 401; every page except /login redirects
 *                 there, remembering where you were headed in ?next=
 */
export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	const userId = token ? readSessionToken(token) : null;
	const user = userId ? getUser(userId) : null;

	const path = event.url.pathname;
	const isLoginPage = path === '/login';

	if (!user) {
		if (path.startsWith('/api/')) return json({ error: 'unauthorized' }, { status: 401 });
		if (!isLoginPage) {
			const next = event.url.pathname + event.url.search;
			redirect(303, next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`);
		}
	} else if (isLoginPage) {
		redirect(303, '/');
	}

	// Null only on /login, which never reads it; every other route is guarded above.
	event.locals.user = user!;

	// The browser writes a `loc` cookie once it has a GPS fix (LocationSync.svelte).
	// Until then, "near you" means near your campus.
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
