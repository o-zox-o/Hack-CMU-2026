import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { addComment, getActivity, joinActivity, leaveActivity, listComments } from '$lib/server/db';

export const load = (({ params, locals }) => {
	const activity = getActivity(params.id, locals.user.id);
	if (!activity) error(404, 'That activity does not exist (or was removed).');

	return { activity, comments: listComments(params.id) };
}) satisfies PageServerLoad;

const JOIN_MESSAGES = {
	'not-found': 'That activity is gone.',
	full: 'Someone grabbed the last spot just before you.',
	'already-joined': "You're already in."
} as const;

const LEAVE_MESSAGES = {
	'not-found': 'That activity is gone.',
	'not-a-member': "You weren't in this one.",
	'host-cannot-leave': "You're the host — you can't leave your own activity."
} as const;

export const actions = {
	join: async ({ params, locals }) => {
		const result = joinActivity(params.id, locals.user.id);
		if (!result.ok) return fail(409, { message: JOIN_MESSAGES[result.reason] });
		return { message: null };
	},

	leave: async ({ params, locals }) => {
		const result = leaveActivity(params.id, locals.user.id);
		if (!result.ok) return fail(409, { message: LEAVE_MESSAGES[result.reason] });
		return { message: null };
	},

	comment: async ({ request, params, locals }) => {
		const form = await request.formData();
		const body = String(form.get('body') ?? '').trim();

		if (body.length === 0) return fail(400, { message: 'Write something first.' });
		if (body.length > 1000) return fail(400, { message: 'Keep comments under 1000 characters.' });

		const created = addComment(params.id, locals.user.id, body);
		if (!created) return fail(404, { message: 'That activity is gone.' });

		return { message: null };
	}
} satisfies Actions;
