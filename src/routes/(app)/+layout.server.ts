import type { LayoutServerLoad } from './$types';
import { isPast } from '$lib/format';
import { campusesByDistance } from '$lib/geo';
import { listActivities } from '$lib/server/db';
import { DEFAULT_RADIUS } from '$lib/types';

export const load = (async ({ locals }) => {
	const viewer = { id: locals.user.id, location: locals.location };

	const openNearby = (await listActivities({ within: DEFAULT_RADIUS }, viewer)).filter(
		(a) => !a.isFull && !isPast(a.startsAt)
	).length;

	return {
		user: locals.user,
		location: locals.location,
		locationSource: locals.locationSource,
		openNearby,
		/** Every campus with its distance from the viewer, nearest first. */
		campuses: campusesByDistance(locals.location)
	};
}) satisfies LayoutServerLoad;
