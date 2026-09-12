import type { LayoutServerLoad } from './$types';
import { feedQueryFromUrl } from '$lib/feed-query';
import { isPast } from '$lib/format';
import { campusesByDistance, radiusMiles } from '$lib/geo';
import { listActivities } from '$lib/server/db';
import { campusMeta, DEFAULT_RADIUS } from '$lib/types';
import { viewerFrom } from '$lib/server/viewer';
import { claimNewBadges } from '$lib/server/badges';

export const load = (async ({ locals, url }) => {
	const viewer = viewerFrom(locals);

	/* The rail's count follows whatever place the user is actually looking at.
	   Only the location scope carries over — category, free and search narrow
	   the feed, not the "what's around me" stat. */
	const { campus, within = DEFAULT_RADIUS } = feedQueryFromUrl(url);

	const [feed, newBadges] = await Promise.all([
		listActivities({ campus, within }, viewer),
		// Badges are earned by other people's actions (a host confirming an
		// activity), so there's no one action to hang this off. Checked here so
		// it lands wherever the user happens to be.
		claimNewBadges(locals.user.id)
	]);

	const open = feed.filter((a) => !a.isFull && !isPast(a.startsAt)).length;

	const miles = radiusMiles(within);
	const openLabel = campus
		? `open at ${campusMeta(campus).short}`
		: miles === null
			? 'open anywhere'
			: `open within ${miles} mi`;

	return {
		user: locals.user,
		/** Congratulations lines for badges earned since the last page load. */
		newBadges,
		location: locals.location,
		locationSource: locals.locationSource,
		open,
		openLabel,
		/** Every campus with its distance from the viewer, nearest first. */
		campuses: campusesByDistance(locals.location)
	};
}) satisfies LayoutServerLoad;
