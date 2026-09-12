import type { PageServerLoad } from './$types.js';
import { toClientUser } from '$lib/server/users.js';

export const load: PageServerLoad = ({ locals }) => {
	return { user: locals.user ? toClientUser(locals.user) : null };
};
