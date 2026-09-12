import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	addComment,
	approveWaitlist,
	declineWaitlist,
	getActivity,
	joinActivity,
	joinWaitlist,
	leaveActivity,
	leaveWaitlist,
	listComments,
	rateActivity,
	refreshLearnedInterests
} from '$lib/server/db';
import {
	notifyHostOfWaitlistRequest,
	notifyWaitlistApproved,
	sendJoinEmails
} from '$lib/server/email';

export const load = (async ({ params, locals }) => {
	const activity = await getActivity(params.id, {
		id: locals.user.id,
		location: locals.location,
		interests: locals.interests
	});
	if (!activity) error(404, 'That activity does not exist (or was removed).');

	return { activity, comments: await listComments(params.id, locals.user.id) };
}) satisfies PageServerLoad;

const JOIN_MESSAGES = {
	'not-found': 'That activity is gone.',
	full: 'Someone grabbed the last spot just before you.',
	'already-joined': "You're already in."
} as const;

const WAITLIST_MESSAGES = {
	'not-found': 'That activity is gone.',
	'not-full': "There's still room — you can just join.",
	'already-joined': "You're already in.",
	'already-waiting': "You've already asked to join.",
	'not-waiting': "You weren't on the list."
} as const;

const APPROVAL_MESSAGES = {
	'not-found': 'That activity is gone.',
	'not-host': 'Only the host can do that.',
	'not-waiting': 'They are no longer waiting.'
} as const;

const RATE_MESSAGES = {
	'not-found': 'That activity is gone.',
	'not-attended': 'Only people who went can rate it.',
	'not-yet': "It hasn't happened yet.",
	'already-rated': 'You already rated this one.',
	'bad-score': 'Pick between 1 and 5.'
} as const;

const LEAVE_MESSAGES = {
	'not-found': 'That activity is gone.',
	'not-a-member': "You weren't in this one.",
	'host-cannot-leave': "You're the host — you can't leave your own activity."
} as const;

export const actions = {
	join: async ({ params, locals, url }) => {
		const result = await joinActivity(params.id, locals.user.id);
		if (!result.ok) return fail(409, { message: JOIN_MESSAGES[result.reason] });

		// Tell the host someone joined, and confirm the details to the joiner.
		// Awaited so it isn't cut off when the serverless function ends; neither
		// throws, so a mail problem can't fail the join.
		await Promise.all([
			sendJoinEmails(result.activity, locals.user, url.origin),
			// Joining is the signal; three of a kind and it becomes an interest.
			refreshLearnedInterests(locals.user.id)
		]);

		return { message: null };
	},

	leave: async ({ params, locals }) => {
		const result = await leaveActivity(params.id, locals.user.id);
		if (!result.ok) return fail(409, { message: LEAVE_MESSAGES[result.reason] });
		return { message: null };
	},

	/** Ask to join something that's already full. */
	requestSpot: async ({ params, locals, url }) => {
		const result = await joinWaitlist(params.id, locals.user.id);
		if (!result.ok) return fail(409, { message: WAITLIST_MESSAGES[result.reason] });

		await notifyHostOfWaitlistRequest(result.activity, locals.user, url.origin);
		return { message: null };
	},

	/** Withdraw that request. */
	cancelRequest: async ({ params, locals }) => {
		const result = await leaveWaitlist(params.id, locals.user.id);
		if (!result.ok) return fail(409, { message: WAITLIST_MESSAGES[result.reason] });
		return { message: null };
	},

	/** Host lets someone in off the list. */
	approve: async ({ request, params, locals, url }) => {
		const form = await request.formData();
		const userId = String(form.get('userId') ?? '');

		const result = await approveWaitlist(params.id, locals.user.id, userId);
		if (!result.ok) return fail(409, { message: APPROVAL_MESSAGES[result.reason] });

		await notifyWaitlistApproved(result.activity, userId, url.origin);
		return { message: null };
	},

	/** Host turns a request down. */
	decline: async ({ request, params, locals }) => {
		const form = await request.formData();
		const result = await declineWaitlist(
			params.id,
			locals.user.id,
			String(form.get('userId') ?? '')
		);
		if (!result.ok) return fail(409, { message: APPROVAL_MESSAGES[result.reason] });
		return { message: null };
	},

	/** Anonymous — the score is stored against the activity, not shown per person. */
	rate: async ({ request, params, locals }) => {
		const form = await request.formData();
		const result = await rateActivity(params.id, locals.user.id, Number(form.get('score')));

		if (!result.ok) return fail(409, { message: RATE_MESSAGES[result.reason] });
		return { message: null };
	},

	comment: async ({ request, params, locals }) => {
		const form = await request.formData();
		const body = String(form.get('body') ?? '').trim();

		if (body.length === 0) return fail(400, { message: 'Write something first.' });
		if (body.length > 1000) return fail(400, { message: 'Keep comments under 1000 characters.' });

		const created = await addComment(params.id, locals.user.id, body);
		if (!created) return fail(404, { message: 'That activity is gone.' });

		return { message: null };
	}
} satisfies Actions;
