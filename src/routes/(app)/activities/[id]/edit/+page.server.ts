import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getActivity, updateActivity } from '$lib/server/db';
import { validateActivity } from '$lib/validate';
import { viewerFrom } from '$lib/server/viewer';
import { isStudent } from '$lib/types';

export const load = (async ({ params, locals }) => {
	const activity = await getActivity(params.id, viewerFrom(locals));
	if (!activity) error(404, 'That activity does not exist (or was removed).');
	if (!activity.isHost) error(403, 'Only the host can edit this activity.');

	return { activity, student: isStudent(locals.user) };
}) satisfies PageServerLoad;

const UPDATE_MESSAGES = {
	'not-found': 'That activity is gone.',
	'not-host': 'Only the host can edit this activity.',
	'too-few-spots': 'Someone joined while you were editing, so you need at least that many spots.'
} as const;

export const actions = {
	default: async ({ request, params, locals }) => {
		const form = await request.formData();

		// Re-read rather than trusting the page: the floor has to be the people
		// in right now, not whoever was in when the form was rendered.
		const current = await getActivity(params.id, viewerFrom(locals));
		if (!current) error(404, 'That activity is gone.');
		if (!current.isHost) error(403, 'Only the host can edit this activity.');

		const result = validateActivity(form, {
			student: isStudent(locals.user),
			minSpots: current.spotsTaken,
			// It's already started; its own start time shouldn't block a fix.
			allowPastStart: true
		});
		if (!result.ok) return fail(400, { errors: result.errors });

		const updated = await updateActivity(params.id, locals.user.id, result.value);
		if (!updated.ok) {
			return fail(409, { errors: { form: UPDATE_MESSAGES[updated.reason] } });
		}

		redirect(303, `/activities/${params.id}`);
	}
} satisfies Actions;
