import type { Handle } from '@sveltejs/kit';
import { DEMO_USER_ID, getUser, listUsers } from '$lib/server/db';

/**
 * Auth stub.
 *
 * Every request gets a signed-in user so the whole app is usable before auth
 * exists. A `demo_user` cookie lets you switch identity while building — handy
 * for testing "join" from a second account without a second browser:
 *
 *   document.cookie = 'demo_user=u_theo; path=/'
 *
 * REPLACE ME with a real session lookup (Auth0 etc). The only contract the rest
 * of the app relies on is that `locals.user` is set before any load or action
 * runs, so swapping this out touches exactly this file.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const cookieId = event.cookies.get('demo_user');

	let user = cookieId ? await getUser(cookieId) : null;

	if (!user) {
		user = await getUser(DEMO_USER_ID);
	}

	if (!user) {
		const users = await listUsers();
		user = users[0] ?? null;
	}

	if (!user) {
		throw new Error('No users found in database');
	}

	event.locals.user = user;

	return resolve(event);
};
