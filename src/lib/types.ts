/**
 * Shared domain types.
 *
 * IMPORTANT — the DB/wire split:
 *   `Activity`     is the stored document shape. When you move to MongoDB this
 *                  gains `_id: ObjectId` and stays server-only.
 *   `ActivityView` is what pages and API responses get: plain JSON, `id` as a
 *                  string, host inlined, and the derived fields the UI needs.
 *
 * Cross the boundary in exactly one place (`toView` in $lib/server/db.ts) so an
 * ObjectId can never leak into client code.
 */

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

export const CATEGORIES = [
	{
		id: 'subscriptions',
		label: 'Subscriptions',
		emoji: '🎧',
		blurb: 'Spotify, Netflix, Duolingo — split the family plan'
	},
	{
		id: 'groceries',
		label: 'Groceries',
		emoji: '🛒',
		blurb: 'Costco runs, bulk buys, produce splits'
	},
	{
		id: 'rides',
		label: 'Rides',
		emoji: '🚗',
		blurb: 'Airport Ubers, carpools, weekend trips'
	},
	{
		id: 'food',
		label: 'Food orders',
		emoji: '🍜',
		blurb: 'Hit the delivery minimum together'
	},
	{
		id: 'supplies',
		label: 'Supplies',
		emoji: '📦',
		blurb: 'IKEA hauls, dorm stuff, textbooks'
	},
	{
		id: 'errands',
		label: 'Errands',
		emoji: '🧺',
		blurb: 'Laundry, moving help, post office'
	},
	{ id: 'other', label: 'Other', emoji: '🌿', blurb: 'Anything else worth sharing' }
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as readonly CategoryId[];

export function categoryMeta(id: CategoryId) {
	return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function isCategoryId(value: unknown): value is CategoryId {
	return typeof value === 'string' && CATEGORY_IDS.includes(value as CategoryId);
}

/* -------------------------------------------------------------------------- */
/* Campuses                                                                    */
/* -------------------------------------------------------------------------- */

export const CAMPUSES = [
	{ id: 'cmu', label: 'Carnegie Mellon', short: 'CMU' },
	{ id: 'pitt', label: 'University of Pittsburgh', short: 'Pitt' },
	{ id: 'chatham', label: 'Chatham University', short: 'Chatham' },
	{ id: 'duquesne', label: 'Duquesne University', short: 'Duquesne' },
	{ id: 'carlow', label: 'Carlow University', short: 'Carlow' }
] as const;

export type CampusId = (typeof CAMPUSES)[number]['id'];

export function campusMeta(id: CampusId) {
	return CAMPUSES.find((c) => c.id === id) ?? CAMPUSES[0];
}

export function isCampusId(value: unknown): value is CampusId {
	return typeof value === 'string' && CAMPUSES.some((c) => c.id === value);
}

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

export interface User {
	id: string;
	name: string;
	handle: string;
	campus: CampusId;
	bio: string;
	/** Index into the avatar palette — keeps seeded users visually distinct. */
	avatarSeed: number;
	joinedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Activities                                                                  */
/* -------------------------------------------------------------------------- */

/** How the posted price should be read. */
export type CostBasis = 'per-person' | 'total';

/** Stored shape. Server-only — never hand this straight to a page. */
export interface Activity {
	id: string;
	title: string;
	body: string;
	category: CategoryId;
	campus: CampusId;
	hostId: string;
	/** Free-text meeting point, e.g. "Giant Eagle, Shadyside". */
	location: string;
	/** ISO 8601. */
	startsAt: string;
	/** Total headcount including the host. */
	spots: number;
	/** Everyone in, host first. Length must never exceed `spots`. */
	memberIds: string[];
	/** Integer cents. NEVER a float — money math on floats drifts. */
	costCents: number;
	costBasis: CostBasis;
	createdAt: string;
}

/** Wire/UI shape. Safe to serialise into a page payload. */
export interface ActivityView {
	id: string;
	title: string;
	body: string;
	category: CategoryId;
	campus: CampusId;
	location: string;
	startsAt: string;
	spots: number;
	costCents: number;
	costBasis: CostBasis;
	createdAt: string;
	host: User;
	members: User[];
	commentCount: number;
	/* Derived — computed once on the server so the UI never recalculates. */
	spotsTaken: number;
	spotsLeft: number;
	isFull: boolean;
	/** Is the current viewer already in? */
	joined: boolean;
	/** Is the current viewer the host? */
	isHost: boolean;
}

export interface Comment {
	id: string;
	activityId: string;
	authorId: string;
	body: string;
	createdAt: string;
}

export interface CommentView {
	id: string;
	body: string;
	createdAt: string;
	author: User;
}

/* -------------------------------------------------------------------------- */
/* Query + input shapes                                                        */
/* -------------------------------------------------------------------------- */

export const SORTS = [
	{ id: 'soonest', label: 'Soonest' },
	{ id: 'cheapest', label: 'Cheapest' },
	{ id: 'new', label: 'New' }
] as const;

export type SortId = (typeof SORTS)[number]['id'];

export function isSortId(value: unknown): value is SortId {
	return typeof value === 'string' && SORTS.some((s) => s.id === value);
}

export interface FeedQuery {
	category?: CategoryId;
	/** Undefined means every campus. The feed defaults to the viewer's own. */
	campus?: CampusId;
	/** Only activities that cost nothing — free food, giveaways. */
	free?: boolean;
	q?: string;
	sort?: SortId;
}

export interface NewActivityInput {
	title: string;
	body: string;
	category: CategoryId;
	campus: CampusId;
	location: string;
	startsAt: string;
	spots: number;
	costCents: number;
	costBasis: CostBasis;
}
