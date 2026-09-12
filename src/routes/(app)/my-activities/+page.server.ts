import type { PageServerLoad } from './$types';
import { isPast } from '$lib/format';
import { activitiesHostedBy, activitiesJoinedBy } from '$lib/server/db';

const FILTERS = ['all', 'hosting', 'joined'] as const;
export type MyFilter = (typeof FILTERS)[number];

export const load = (async ({ locals, url }) => {
	const viewer = {
		id: locals.user.id,
		location: locals.location,
		interests: locals.interests
	};

	const [hosting, joined] = await Promise.all([
		activitiesHostedBy(locals.user.id, viewer),
		activitiesJoinedBy(locals.user.id, viewer)
	]);

	const raw = url.searchParams.get('filter');
	const filter: MyFilter = FILTERS.includes(raw as MyFilter) ? (raw as MyFilter) : 'all';

	const chosen =
		filter === 'hosting' ? hosting : filter === 'joined' ? joined : [...hosting, ...joined];

	/* One list, soonest first — that's the "everything in one place" view.
	   Anything already started drops into Past. */
	const upcoming = chosen
		.filter((a) => !isPast(a.startsAt))
		.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
	const past = chosen
		.filter((a) => isPast(a.startsAt))
		.sort((a, b) => b.startsAt.localeCompare(a.startsAt));

	return {
		filter,
		upcoming,
		past,
		counts: { all: hosting.length + joined.length, hosting: hosting.length, joined: joined.length }
	};
}) satisfies PageServerLoad;
