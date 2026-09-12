/**
 * Shared domain types.
 *
 * IMPORTANT — the DB/wire split:
 *   `Activity`     is the stored document shape (server-only).
 *   `ActivityView` is what pages and API responses get: host inlined,
 *                  spots precomputed, safe for the browser.
 *
 * Cross the boundary in `toView` in $lib/server/db.ts so server fields
 * never leak into client code.
 */

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

export const CATEGORIES = [
	{
		id: 'subscriptions',
		label: 'Subscriptions',
		icon: 'subscriptions',
		blurb: 'Spotify, Netflix, Duolingo — split the family plan'
	},
	{
		id: 'groceries',
		label: 'Groceries',
		icon: 'groceries',
		blurb: 'Costco runs, bulk buys, produce splits'
	},
	{ id: 'rides', label: 'Rides', icon: 'rides', blurb: 'Airport Ubers, carpools, weekend trips' },
	{ id: 'food', label: 'Food orders', icon: 'food', blurb: 'Hit the delivery minimum together' },
	{
		id: 'supplies',
		label: 'Supplies',
		icon: 'supplies',
		blurb: 'IKEA hauls, dorm stuff, textbooks'
	},
	{ id: 'errands', label: 'Errands', icon: 'errands', blurb: 'Laundry, moving help, post office' },
	{ id: 'other', label: 'Other', icon: 'other', blurb: 'Anything else worth sharing' }
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
/* Campuses                                                                   */
/* -------------------------------------------------------------------------- */

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

export type CampusId = (typeof CAMPUSES)[number]['id'];

export function campusMeta(id: CampusId) {
	return CAMPUSES.find((c) => c.id === id) ?? CAMPUSES[0];
}

export function isCampusId(value: unknown): value is CampusId {
	return typeof value === 'string' && CAMPUSES.some((c) => c.id === value);
}

export interface LatLng {
	lat: number;
	lng: number;
}

/** How far out the feed looks: a distance in miles, or 'all' for no limit. */
export type Radius = number | 'all';

/** One-click distances. Any other positive number works too — see parseRadius. */
export const RADIUS_PRESETS = [10, 50, 150] as const;
export const DEFAULT_RADIUS: Radius = 10;
export const MAX_RADIUS = 5000;

/**
 * Read a radius from a URL param or form field.
 * Accepts 'all' or a positive number of miles; returns null for anything else
 * so callers can fall back to DEFAULT_RADIUS.
 */
export function parseRadius(value: unknown): Radius | null {
	if (value === 'all') return 'all';
	if (typeof value !== 'string' && typeof value !== 'number') return null;
	const miles = Number(value);
	if (!Number.isFinite(miles) || miles <= 0 || miles > MAX_RADIUS) return null;
	return Math.round(miles * 10) / 10; // quarter-mile precision is plenty
}

/** The value to put in `?within=`. */
export function radiusParam(radius: Radius): string {
	return radius === 'all' ? 'all' : String(radius);
}

/** "10 mi" / "Anywhere" — how a radius reads in the UI. */
export function radiusLabel(radius: Radius): string {
	return radius === 'all' ? 'Anywhere' : `${radius} mi`;
}

/* -------------------------------------------------------------------------- */
/* Users                                                                      */
/* -------------------------------------------------------------------------- */

/** Public shape — safe to put in a page payload or show to other users. */
export interface User {
	id: string;
	name: string;
	handle: string;
	campus: CampusId;
	location: string;
	bio: string;
	avatarSeed: number;
	joinedAt: string;

	gender?: string;
	age?: number;
	interests: string[];
}

/** Stored shape — the `users` collection. Server-only. */
export interface UserDoc extends User {
	email: string;
	passwordHash: string;
	/** Set by Auth0 on first login. Absent for password accounts + seed data. */
	auth0Id?: string;
}

export interface SignupInput {
	name: string;
	email: string;
	campus: CampusId;
	password: string;
}

/* -------------------------------------------------------------------------- */
/* Activities                                                                 */
/* -------------------------------------------------------------------------- */

export type CostBasis = 'per-person' | 'total';

/** Stored shape in the database. Server-only. */
export interface Activity {
	id: string;
	title: string;
	body: string;
	category: CategoryId;
	campus: CampusId;
	hostId: string;
	location: string;
	startsAt: string;
	spots: number;
	memberIds: string[];
	costCents: number;
	costBasis: CostBasis;
	createdAt: string;
	interests: string[];
}

/** Wire/UI shape. Pre-assembled for the client feed. */
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

	/* Pre-derived fields */
	distanceMiles: number | null;
	spotsTaken: number;
	spotsLeft: number;
	isFull: boolean;
	joined: boolean;
	isHost: boolean;
	interests: string[];
}

/* -------------------------------------------------------------------------- */
/* Comments                                                                   */
/* -------------------------------------------------------------------------- */

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
/* Query + input shapes                                                       */
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
	within?: Radius;
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
