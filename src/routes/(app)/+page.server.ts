import type { PageServerLoad } from './$types';
import { feedQueryFromUrl } from '$lib/feed-query';
import { listActivities } from '$lib/server/db';
import { viewerFrom } from '$lib/server/viewer';

export const load = (async ({ url, locals }) => {
	const query = feedQueryFromUrl(url);
	const viewer = viewerFrom(locals);
	return {
		query,
		activities: await listActivities(query, viewer)
	};
}) satisfies PageServerLoad;
