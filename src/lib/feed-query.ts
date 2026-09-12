import {
	DEFAULT_RADIUS,
	isCampusId,
	isCategoryId,
	isSortId,
	parseRadius,
	type FeedQuery
} from './types';

/**
 * Read ?category=&campus=&within=&free=&q=&sort= off a URL and drop anything invalid.
 * Shared by the feed page and GET /api/activities so both filter identically.
 *
 * The feed is location-based: by default you see activities at campuses within
 * DEFAULT_RADIUS of you. `?within=50` (or any number of miles) widens it,
 * `?within=all` drops the limit,
 * and `?campus=pitt` pins it to one campus regardless of distance.
 */
export function feedQueryFromUrl(url: URL): FeedQuery {
	const category = url.searchParams.get('category');
	const campus = url.searchParams.get('campus');
	const within = url.searchParams.get('within');
	const sort = url.searchParams.get('sort');
	const q = url.searchParams.get('q')?.trim();

	return {
		category: isCategoryId(category) ? category : undefined,
		campus: isCampusId(campus) ? campus : undefined,
		within: parseRadius(within) ?? DEFAULT_RADIUS,
		free: url.searchParams.get('free') === '1',
		sort: isSortId(sort) ? sort : 'foryou',
		q: q || undefined
	};
}
