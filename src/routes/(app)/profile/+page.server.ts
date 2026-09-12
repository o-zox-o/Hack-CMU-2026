import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { clearSessionCookie } from '$lib/server/auth';
import {
	activitiesHostedBy,
	activitiesJoinedBy,
	grassLeaderboard,
	updateProfile
} from '$lib/server/db';
import { isInterest } from '$lib/types';

export const load = (async ({ locals }) => {
	const viewer = {
		id: locals.user.id,
		location: locals.location,
		interests: locals.interests
	};
	const [hosting, joined, leaderboard] = await Promise.all([
		activitiesHostedBy(locals.user.id, viewer),
		activitiesJoinedBy(locals.user.id, viewer),
		grassLeaderboard(1)
	]);

	// Learned interests are server-side only, so the page has to be told.
	const learned = locals.interests.filter((i) => !locals.user.interests.includes(i));

	return {
		hosting,
		joined,
		learned,
		/** Nobody tops an empty board, so a 0-score leader doesn't count. */
		isTopToucher: leaderboard[0]?.userId === locals.user.id && leaderboard[0].score > 0
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
