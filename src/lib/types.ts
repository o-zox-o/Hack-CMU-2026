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

/** Campuses with coordinates — the feed is "activities at campuses near you". */
export const CAMPUSES = [
	{
		id: 'cmu',
		label: 'Carnegie Mellon',
		short: 'CMU',
		city: 'Pittsburgh',
		lat: 40.4433,
		lng: -79.9436
	},
	{
		id: 'pitt',
		label: 'University of Pittsburgh',
		short: 'Pitt',
		city: 'Pittsburgh',
		lat: 40.4444,
		lng: -79.9608
	},
	{
		id: 'chatham',
		label: 'Chatham University',
		short: 'Chatham',
		city: 'Pittsburgh',
		lat: 40.4497,
		lng: -79.9235
	},
	{
		id: 'duquesne',
		label: 'Duquesne University',
		short: 'Duquesne',
		city: 'Pittsburgh',
		lat: 40.4364,
		lng: -79.9917
	},
	{
		id: 'carlow',
		label: 'Carlow University',
		short: 'Carlow',
		city: 'Pittsburgh',
		lat: 40.4394,
		lng: -79.9631
	},
	{
		id: 'wvu',
		label: 'West Virginia University',
		short: 'WVU',
		city: 'Morgantown',
		lat: 39.6354,
		lng: -79.9553
	},
	{
		id: 'psu',
		label: 'Penn State',
		short: 'PSU',
		city: 'State College',
		lat: 40.7982,
		lng: -77.8599
	}
] as const;

export interface LatLng {
	lat: number;
	lng: number;
}

/** Feed radius choices. `miles: null` means no limit. */
export const RADII = [
	{ id: '10', miles: 10, label: '10 mi' },
	{ id: '50', miles: 50, label: '50 mi' },
	{ id: '150', miles: 150, label: '150 mi' },
	{ id: 'all', miles: null, label: 'Anywhere' }
] as const;

export type RadiusId = (typeof RADII)[number]['id'];
export const DEFAULT_RADIUS: RadiusId = '10';

export function isRadiusId(value: unknown): value is RadiusId {
	return typeof value === 'string' && RADII.some((r) => r.id === value);
}

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

/** Public shape — safe to put in a page payload or show to other users. */
export interface User {
  id: string;
  name: string;
  handle: string;
  campus: CampusId;
  bio: string;
  avatarSeed: number;
  joinedAt: string;

  // Public matching attributes
  gender?: string;
  age?: number;
  interests: string[];
}

/**
 * Stored shape — the `users` collection. Server-only. `toUser()` in db.ts
 * strips the credentials before data reaches any page.
 */
export interface UserDoc extends User {
  email: string;
  passwordHash: string;
  auth0Id: string; // <-- Place it here! Stored safely on the server
}

export interface SignupInput {
	name: string;
	email: string;
	campus: CampusId;
	password: string;
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
	/** Miles from the viewer to this activity's campus; null if no location. */
	distanceMiles: number | null;
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
	{ id: 'nearest', label: 'Nearest' },
	{ id: 'cheapest', label: 'Cheapest' },
	{ id: 'new', label: 'New' }
] as const;

export type SortId = (typeof SORTS)[number]['id'];

export function isSortId(value: unknown): value is SortId {
	return typeof value === 'string' && SORTS.some((s) => s.id === value);
}

export interface FeedQuery {
	category?: CategoryId;
	/** An explicit single campus. Overrides `within`. */
	campus?: CampusId;
	/** Radius around the viewer's location. Defaults to DEFAULT_RADIUS. */
	within?: RadiusId;
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
