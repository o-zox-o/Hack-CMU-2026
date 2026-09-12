import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	activitiesHostedBy,
	activitiesJoinedBy,
	getUserByHandle,
	grassRank,
	hostStanding
} from '$lib/server/db';
import { isPast } from '$lib/format';
import { grassStats } from '$lib/grass';
import { visibleToAccount } from '$lib/types';

export const load = (async ({ params, locals }) => {
	const user = await getUserByHandle(params.handle);
	if (!user) error(404, 'No one here by that name.');

	// Your own profile is the editable one; don't keep two copies of it.
	if (user.id === locals.user.id) redirect(303, '/profile');

	/* Read their activities as *they* see them, so the grass numbers are their
	   real numbers. What gets listed below is filtered separately: the score is
	   public, the guest list isn't. */
	const owner = { id: user.id, campus: user.campus, accountType: user.accountType };
	const [hosting, joined, rank, standing] = await Promise.all([
		activitiesHostedBy(user.id, owner),
		activitiesJoinedBy(user.id, owner),
		grassRank(user.id),
		hostStanding(user.id)
	]);

	const stats = grassStats(hosting, joined);

	/* A private profile keeps its activities to itself. Everyone else shows the
	   ones this viewer would have been able to find anyway. */
	const visible = user.isPrivate
		? []
		: [...hosting, ...joined].filter((a) => visibleToAccount(a.visibility, a.campus, locals.user));

	return {
		profile: user,
		stats,
		standing,
		rank,
		upcoming: visible
			.filter((a) => !isPast(a.startsAt))
			.sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
		past: visible
			.filter((a) => isPast(a.startsAt))
			.sort((a, b) => b.startsAt.localeCompare(a.startsAt))
			.slice(0, 6),
		/** How many were withheld, so the page can be honest without naming them. */
		hidden: user.isPrivate ? hosting.length + joined.length : 0
	};
}) satisfies PageServerLoad;
