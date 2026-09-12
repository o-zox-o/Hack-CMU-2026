import { isCampusId, isCategoryId, isSortId, type CampusId, type FeedQuery } from './types';

/**
 * Read ?category=&campus=&free=&q=&sort= off a URL and drop anything invalid.
 * Shared by the feed page and GET /api/activities so both filter identically.
 *
 * The feed is location-based: with no campus in the URL you see your own
 * campus. `?campus=all` widens it to everyone; `?campus=pitt` picks another.
 */
export function feedQueryFromUrl(url: URL, viewerCampus: CampusId): FeedQuery {
	const category = url.searchParams.get('category');
	const campusParam = url.searchParams.get('campus');
	const sort = url.searchParams.get('sort');
	const q = url.searchParams.get('q')?.trim();

	let campus: CampusId | undefined = viewerCampus;
	if (campusParam === 'all') campus = undefined;
	else if (isCampusId(campusParam)) campus = campusParam;

	return {
		category: isCategoryId(category) ? category : undefined,
		campus,
		free: url.searchParams.get('free') === '1',
		sort: isSortId(sort) ? sort : 'soonest',
		q: q || undefined
	};
}
