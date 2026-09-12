import type { PageServerLoad } from './$types';
import { feedQueryFromUrl } from '$lib/feed-query';
import { listActivities } from '$lib/server/db';

export const load = (({ url, locals }) => {
	const query = feedQueryFromUrl(url);
	const viewer = { id: locals.user.id, location: locals.location };
	return {
		query,
		activities: listActivities(query, viewer)
	};
}) satisfies PageServerLoad;
