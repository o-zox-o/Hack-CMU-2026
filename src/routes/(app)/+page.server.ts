import type { PageServerLoad } from './$types';
import { feedQueryFromUrl } from '$lib/feed-query';
import { listActivitiesWithSemanticSearch } from '$lib/server/semanticSearch';

export const load = (async ({ url, locals }) => {
	const query = feedQueryFromUrl(url);
	const viewer = {
		id: locals.user.id,
		location: locals.location,
		interests: locals.interests
	};
	return {
		query,
		activities: await listActivitiesWithSemanticSearch(query, viewer)
	};
}) satisfies PageServerLoad;
