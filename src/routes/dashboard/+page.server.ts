import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { toClientUser } from '$lib/server/users.js';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	return { user: toClientUser(locals.user) };
};
