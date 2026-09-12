import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { clearSessionCookie } from '$lib/server/auth';
import { activitiesHostedBy, activitiesJoinedBy } from '$lib/server/db';

export const load = (({ locals }) => {
	const viewer = { id: locals.user.id, location: locals.location };
	return {
		hosting: activitiesHostedBy(locals.user.id, viewer),
		joined: activitiesJoinedBy(locals.user.id, viewer)
	};
}) satisfies PageServerLoad;

export const actions = {
	logout: async ({ cookies }) => {
		clearSessionCookie(cookies);
		redirect(303, '/login');
	}
} satisfies Actions;
