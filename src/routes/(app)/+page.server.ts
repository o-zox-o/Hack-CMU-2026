import type { PageServerLoad } from './$types';
import { feedQueryFromUrl } from '$lib/feed-query';
import { listActivitiesWithSemanticSearch } from '$lib/server/semanticSearch';
import { viewerFrom } from '$lib/server/viewer';

export const load = (async ({ url, locals }) => {
	const query = feedQueryFromUrl(url);
	const viewer = viewerFrom(locals);
	return {
		query,
		activities: await listActivitiesWithSemanticSearch(query, viewer)
	};
}) satisfies PageServerLoad;
