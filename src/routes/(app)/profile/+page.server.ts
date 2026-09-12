import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { clearSessionCookie } from '$lib/server/auth';
import {
	activitiesHostedBy,
	activitiesJoinedBy,
	grassRank,
	hostStanding,
	updateProfile
} from '$lib/server/db';
import { isInterest } from '$lib/types';
import { viewerFrom } from '$lib/server/viewer';

export const load = (async ({ locals }) => {
	const viewer = viewerFrom(locals);
	const [hosting, joined, rank, standing] = await Promise.all([
		activitiesHostedBy(locals.user.id, viewer),
		activitiesJoinedBy(locals.user.id, viewer),
		grassRank(locals.user.id),
		hostStanding(locals.user.id)
	]);

	// Learned interests are server-side only, so the page has to be told.
	const learned = locals.interests.filter((i) => !locals.user.interests.includes(i));

	return {
		hosting,
		joined,
		learned,
		standing,
		/** Placing among everyone who has touched grass, for the top 1% badge. */
		rank
	};
}) satisfies PageServerLoad;

export const actions = {
	profile: async ({ request, locals }) => {
		const form = await request.formData();
		await updateProfile(locals.user.id, {
			bio: String(form.get('bio') ?? '')
				.trim()
				.slice(0, 300),
			interests: [...new Set(form.getAll('interests').filter(isInterest))].slice(0, 12),
			isPrivate: form.get('isPrivate') === 'on'
		});
		return { saved: true };
	},

	logout: async ({ cookies }) => {
		clearSessionCookie(cookies);
		redirect(303, '/login');
	}
} satisfies Actions;
