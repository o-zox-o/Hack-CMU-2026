import type { PageServerLoad } from './$types';
import { feedQueryFromUrl } from '$lib/feed-query';
import { listActivities } from '$lib/server/db';

export const load = (({ url, locals }) => {
	const query = feedQueryFromUrl(url, locals.user.campus);
	return {
		query,
		activities: listActivities(query, locals.user.id)
	};
}) satisfies PageServerLoad;
