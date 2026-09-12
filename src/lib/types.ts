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
		id: 'hangouts',
		label: 'Hangouts',
		icon: 'hangouts',
		blurb: 'Karaoke, hikes, study sessions. Plans, not purchases'
	},
	{
		id: 'subscriptions',
		label: 'Subscriptions',
		icon: 'subscriptions',
		blurb: 'Spotify, Netflix, Duolingo. Split the family plan'
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
	{
		id: 'sports',
		label: 'Sports',
		icon: 'sports',
		blurb: 'Pickup games, gym buddies, climbing, court time'
	},
	{ id: 'other', label: 'Misc', icon: 'other', blurb: 'Anything else worth sharing' }
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
/* Interests — the signup survey, and what the feed ranks against             */
/* -------------------------------------------------------------------------- */

/**
 * The tag catalogue. Kept to one screen of chips on purpose: the survey has to
 * be answerable in about ten seconds or people skip it.
 */
export const INTERESTS = [
	'food',
	'coffee',
	'cooking',
	'groceries',
	'bulk buys',
	'farmers markets',
	'free stuff',
	'rides',
	'driving',
	'music',
	'movies',
	'gaming',
	'board games',
	'studying',
	'textbooks',
	'fitness',
	'sports',
	'outdoors',
	'thrifting',
	'furniture',
	'diy',
	'art',
	'photography',
	'sustainability',
	'errands'
] as const;

export type Interest = (typeof INTERESTS)[number];

export function isInterest(value: unknown): value is Interest {
	return typeof value === 'string' && (INTERESTS as readonly string[]).includes(value);
}

/** What a new activity inherits when its host doesn't tag it by hand. */
export const CATEGORY_INTERESTS: Record<CategoryId, string[]> = {
	hangouts: ['music', 'outdoors', 'board games', 'gaming'],
	subscriptions: ['music', 'movies'],
	groceries: ['groceries', 'cooking', 'bulk buys'],
	rides: ['rides', 'driving'],
	food: ['food'],
	supplies: ['furniture', 'diy'],
	errands: ['errands'],
	sports: ['sports', 'fitness', 'outdoors'],
	other: []
};

/* -------------------------------------------------------------------------- */
/* Users                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Where an account sits. Set once at signup from the email address and never
 * changed by hand: a 'student' verified a .edu address, 'general' is anyone
 * else. Only students can see or post student-only activities.
 */
export type AccountType = 'student' | 'general';

export function isStudent(user: { accountType?: AccountType } | null | undefined): boolean {
	// Absent means student: every account predates general sign-ups, and they
	// all had to verify a .edu address to exist.
	return (user?.accountType ?? 'student') === 'student';
}

/** Public shape — safe to put in a page payload or show to other users. */
export interface User {
	id: string;
	name: string;
	handle: string;
	campus: CampusId;
	/** Optional so accounts created before general sign-ups read as students. */
	accountType?: AccountType;
	bio: string;
	/**
	 * Private profiles keep their comments to the people in the activity.
	 * Optional so accounts created before this still parse as public.
	 */
	isPrivate?: boolean;
	avatarSeed: number;
	joinedAt: string;

	gender?: string;
	age?: number;
	interests: string[];
}

/** Stored shape — the `users` collection. Server-only. */
export interface UserDoc extends User {
	email: string;
	/**
	 * Picked up from what you actually join, not from the survey. Kept on the
	 * stored doc only, so it shapes your feed without showing on your profile.
	 */
	learnedInterests?: string[];
	/**
	 * Badge ids this person has already been congratulated for, so a badge
	 * fires its celebration once and not on every page load after.
	 */
	seenBadges?: string[];
	passwordHash: string;
	/** Set by Auth0 on first login. Absent for password accounts + seed data. */
	auth0Id?: string;
}

export interface SignupInput {
	name: string;
	email: string;
	campus: CampusId;
	/** Decided from the email address at signup, not chosen. */
	accountType: AccountType;
	password: string;
	/** From the signup survey. May be empty — the feed falls back to time + distance. */
	interests: string[];
}

/* -------------------------------------------------------------------------- */
/* Activities                                                                 */
/* -------------------------------------------------------------------------- */

export type CostBasis = 'per-person' | 'total';

/**
 * Who can find an activity, narrowest last.
 *
 *   'public'   anyone with an account, general sign-ups included.
 *   'students' anyone with a verified .edu address, whatever their campus.
 *              This is the edu hub: general accounts can't see in.
 *   'campus'   students at the host's own campus, and nobody else.
 *   'private'  kept out of every feed and search. The link is the invite:
 *              whoever the host sends it to can open it and ask to join.
 *
 * Only a student account may post to 'students' or 'campus'. Students can see
 * everything they qualify for, general accounts see 'public' and 'private'.
 */
export const VISIBILITIES = ['public', 'students', 'campus', 'private'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export function isVisibility(value: unknown): value is Visibility {
	return typeof value === 'string' && (VISIBILITIES as readonly string[]).includes(value);
}

/** The two tiers that need a verified student address. */
export function isStudentOnly(visibility: Visibility): boolean {
	return visibility === 'students' || visibility === 'campus';
}

/**
 * Deliberately conservative: "would this activity be visible to an account
 * like this one, knowing nothing about whether they're personally in it?"
 *
 * Used where a list of someone else's activities is rendered, like a public
 * profile. Private always fails here, even for someone holding the link,
 * because a profile is not that link. Erring towards hiding is the right way
 * to err in a list you don't control.
 */
export function visibleToAccount(
	visibility: Visibility,
	activityCampus: CampusId,
	viewer: { accountType?: AccountType; campus?: CampusId }
): boolean {
	if (visibility === 'private') return false;
	if (visibility === 'public') return true;
	if (!isStudent(viewer)) return false;
	return visibility === 'students' || viewer.campus === activityCampus;
}

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
	/**
	 * People waiting on the host, oldest request first — either because it
	 * filled up or because the host approves everyone.
	 * Optional so activities stored before waitlists existed still parse.
	 */
	waitlistIds?: string[];
	/**
	 * Both optional so activities stored before hosts could choose still
	 * parse — as public, and joinable without asking.
	 */
	visibility?: Visibility;
	/** Every join goes through the host, even while there are spots free. */
	approvalRequired?: boolean;
	/**
	 * When the host confirmed it actually happened. Until this is set, nobody
	 * gets grass for it: a plan on a calendar isn't grass touched.
	 */
	completedAt?: string;
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
	/** Resolved from the stored doc, so the UI never has to guess a default. */
	visibility: Visibility;
	approvalRequired: boolean;
	completedAt: string | null;
	/** Members may share live location between these two moments. */
	sharingOpen: boolean;
	sharingClosesAt: string;
	/** The host says it happened. This is what turns it into grass. */
	isComplete: boolean;
	/** Started, but the host hasn't confirmed it happened yet. */
	awaitingCompletion: boolean;
	host: User;
	members: User[];
	/** Pending requests, oldest first. Only the host acts on these. */
	waitlist: User[];
	commentCount: number;

	/* Pre-derived fields */
	distanceMiles: number | null;
	/** How well this matches the viewer, 0-100. Null if they skipped the survey. */
	matchPercent: number | null;
	spotsTaken: number;
	spotsLeft: number;
	isFull: boolean;
	joined: boolean;
	/** Has the current viewer asked to join a full activity? */
	onWaitlist: boolean;
	isHost: boolean;
	/** Slipped into the For you feed on purpose, outside your usual taste. */
	isWildcard?: boolean;
	rating: RatingSummary;
	interests: string[];
}

/* -------------------------------------------------------------------------- */
/* Live location                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Sharing where you are, so a group can actually find each other.
 *
 * Deliberately narrow. It is opt-in per activity, readable only by the people
 * in that activity, and it switches itself off: the stored point expires after
 * LOCATION_TTL_SECONDS, so closing the tab or losing signal ends the sharing
 * without anyone having to remember to stop it. Not sharing is the resting
 * state, and every failure mode falls back to it.
 */
export interface LiveLocation {
	activityId: string;
	userId: string;
	lat: number;
	lng: number;
	/** Also what the database expires the row on. */
	updatedAt: string;
}

/** What the map gets. Never a user id without the person attached. */
export interface LiveLocationView {
	user: User;
	lat: number;
	lng: number;
	updatedAt: string;
}

/**
 * How long a point survives without a refresh. The client re-posts well inside
 * this, so a marker going stale means they really have stopped.
 */
export const LOCATION_TTL_SECONDS = 120;

/** Sharing opens this long before the start time. */
export const SHARE_OPENS_MINUTES_BEFORE = 5;

/**
 * How far behind "now" a start time may be. Posting something you're about to
 * do means the clock has usually moved on by the time you finish typing, and
 * refusing that is pedantic about a minute nobody cares about.
 */
export const START_GRACE_MINUTES = 5;
/** And closes this long after it, since activities have no end time. */
export const SHARE_CLOSES_HOURS_AFTER = 3;

/** The window during which an activity's members may share and see locations. */
export function sharingWindow(startsAt: string): { opens: number; closes: number } {
	const start = new Date(startsAt).getTime();
	return {
		opens: start - SHARE_OPENS_MINUTES_BEFORE * 60_000,
		closes: start + SHARE_CLOSES_HOURS_AFTER * 3_600_000
	};
}

export function isSharingOpen(startsAt: string, now = Date.now()): boolean {
	const { opens, closes } = sharingWindow(startsAt);
	return now >= opens && now <= closes;
}

/* -------------------------------------------------------------------------- */
/* Ratings                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * An anonymous score left after an activity happened.
 *
 * `raterId` exists only to stop double-rating and to stop people rating
 * activities they didn't go to. It is never put in a view — see RatingSummary,
 * which is all the UI ever sees.
 */
export interface Rating {
	id: string;
	activityId: string;
	hostId: string;
	raterId: string;
	/** 1 (bad) to 5 (great). */
	score: number;
	createdAt: string;
}

export const MIN_SCORE = 1;
export const MAX_SCORE = 5;

/** A score at or below this counts against the host. */
export const BAD_SCORE = 2;

/** Ratings are only shown once this many exist, so nobody is identifiable. */
export const MIN_RATINGS_TO_SHOW = 2;

/** How many badly-rated activities before a host is warned. */
export const WARNING_THRESHOLD = 3;

/** A host's record across everything they've run. */
export interface HostStanding {
	hosted: number;
	ratedActivities: number;
	/** Activities whose average came out at or below BAD_SCORE. */
	poorlyRated: number;
	/** Average across every rating they've received, or null if too few. */
	average: number | null;
	/** True once poorlyRated reaches WARNING_THRESHOLD. */
	warned: boolean;
}

export interface RatingSummary {
	count: number;
	/** Null until MIN_RATINGS_TO_SHOW ratings exist. */
	average: number | null;
	/** Has the current viewer already rated this? */
	rated: boolean;
	/** Can the viewer rate — went to it, and it has happened? */
	canRate: boolean;
}

/** Where someone sits among everyone who has touched grass. */
export interface GrassRank {
	score: number;
	/** 1-based. Ties share a rank, so two people on 9 are both 2nd. */
	rank: number;
	/** People with at least one completed activity. Nobody else is in the race. */
	total: number;
	isTopPercent: boolean;
}

/* -------------------------------------------------------------------------- */
/* Comments                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Who a comment is for.
 *   'everyone' — anyone who can see the activity.
 *   'members'  — only the people who joined it, plus the author.
 */
export type CommentVisibility = 'everyone' | 'members';

export function isCommentVisibility(value: unknown): value is CommentVisibility {
	return value === 'everyone' || value === 'members';
}

export interface Comment {
	id: string;
	activityId: string;
	authorId: string;
	body: string;
	/**
	 * Optional so comments written before this was a choice still parse —
	 * those fall back to the author's profile-wide privacy setting.
	 */
	visibility?: CommentVisibility;
	createdAt: string;
}

export interface CommentView {
	id: string;
	body: string;
	createdAt: string;
	/** Resolved, so the UI can mark a comment that isn't public. */
	visibility: CommentVisibility;
	author: User;
}

/* -------------------------------------------------------------------------- */
/* Query + input shapes                                                       */
/* -------------------------------------------------------------------------- */

export const SORTS = [
	{ id: 'foryou', label: 'For you' },
	{ id: 'random', label: 'Surprise me' },
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
	visibility: Visibility;
	approvalRequired: boolean;
	/**
	 * Tags for feed matching. Optional: supply them (ai.ts generates them from
	 * the title and body) or leave them out and the category's defaults apply.
	 */
	interests?: string[];
}

/**
 * What a host may change after posting. Same fields as the create form —
 * the edit form submits all of them — but partial so a caller can nudge one
 * thing (bumping `spots` to let more people in) without restating the rest.
 */
export type ActivityPatch = Partial<NewActivityInput>;
