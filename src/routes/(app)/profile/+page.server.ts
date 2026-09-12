import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { clearSessionCookie } from '$lib/server/auth';
import { activitiesHostedBy, activitiesJoinedBy, updateProfile } from '$lib/server/db';
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
	profile: async ({ request, locals }) => {
		const form = await request.formData();
		await updateProfile(locals.user.id, {
			bio: String(form.get('bio') ?? '')
				.trim()
				.slice(0, 300),
			location: String(form.get('location') ?? '')
				.trim()
				.slice(0, 80),
			interests: [...new Set(form.getAll('interests').filter(isInterest))].slice(0, 12)
		});
		return { saved: true };
	},

	logout: async ({ cookies }) => {
		clearSessionCookie(cookies);
		redirect(303, '/login');
	}
} satisfies Actions;
