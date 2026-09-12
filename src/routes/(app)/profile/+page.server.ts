import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { clearSessionCookie } from '$lib/server/auth';
import { activitiesHostedBy, activitiesJoinedBy } from '$lib/server/db';

export const load = (async ({ locals }) => {
	const viewer = { id: locals.user.id, location: locals.location };
	const [hosting, joined] = await Promise.all([
		activitiesHostedBy(locals.user.id, viewer),
		activitiesJoinedBy(locals.user.id, viewer)
	]);
	return { hosting, joined };
}) satisfies PageServerLoad;

export const actions = {
	logout: async ({ cookies }) => {
		clearSessionCookie(cookies);
		redirect(303, '/login');
	}
} satisfies Actions;
