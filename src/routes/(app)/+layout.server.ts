import type { LayoutServerLoad } from './$types';
import { feedQueryFromUrl } from '$lib/feed-query';
import { isPast } from '$lib/format';
import { campusesByDistance, radiusMiles } from '$lib/geo';
import { listActivities } from '$lib/server/db';
import { campusMeta, DEFAULT_RADIUS } from '$lib/types';

export const load = (async ({ locals, url }) => {
	const viewer = {
		id: locals.user.id,
		location: locals.location,
		interests: locals.interests
	};

	/* The rail's count follows whatever place the user is actually looking at.
	   Only the location scope carries over — category, free and search narrow
	   the feed, not the "what's around me" stat. */
	const { campus, within = DEFAULT_RADIUS } = feedQueryFromUrl(url);

	const open = (await listActivities({ campus, within }, viewer)).filter(
		(a) => !a.isFull && !isPast(a.startsAt)
	).length;

	const miles = radiusMiles(within);
	const openLabel = campus
		? `open at ${campusMeta(campus).short}`
		: miles === null
			? 'open anywhere'
			: `open within ${miles} mi`;

	return {
		user: locals.user,
		location: locals.location,
		locationSource: locals.locationSource,
		open,
		openLabel,
		/** Every campus with its distance from the viewer, nearest first. */
		campuses: campusesByDistance(locals.location)
	};
}) satisfies LayoutServerLoad;
