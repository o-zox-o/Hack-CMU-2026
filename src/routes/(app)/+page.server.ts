import type { PageServerLoad } from './$types';
import { feedQueryFromUrl } from '$lib/feed-query';
import { listActivities } from '$lib/server/db';

export const load = (async ({ url, locals }) => {
	const query = feedQueryFromUrl(url);
	const viewer = {
		id: locals.user.id,
		location: locals.location,
		interests: locals.user.interests
	};
	return {
		query,
		activities: await listActivities(query, viewer)
	};
}) satisfies PageServerLoad;
