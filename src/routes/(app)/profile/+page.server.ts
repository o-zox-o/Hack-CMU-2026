import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { clearSessionCookie } from '$lib/server/auth';
import { activitiesHostedBy, activitiesJoinedBy, setInterests } from '$lib/server/db';
import { isInterest } from '$lib/types';

export const load = (async ({ locals }) => {
	const viewer = {
		id: locals.user.id,
		location: locals.location,
		interests: locals.user.interests
	};
	const [hosting, joined] = await Promise.all([
		activitiesHostedBy(locals.user.id, viewer),
		activitiesJoinedBy(locals.user.id, viewer)
	]);
	return { hosting, joined };
}) satisfies PageServerLoad;

export const actions = {
	interests: async ({ request, locals }) => {
		const form = await request.formData();
		const chosen = [...new Set(form.getAll('interests').filter(isInterest))].slice(0, 12);
		await setInterests(locals.user.id, chosen);
		return { saved: true };
	},

	logout: async ({ cookies }) => {
		clearSessionCookie(cookies);
		redirect(303, '/login');
	}
} satisfies Actions;
