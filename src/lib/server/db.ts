/**
 * In-memory data store — the ONLY module that knows how activities are stored.
 *
 * Swapping to MongoDB means rewriting the function bodies below and nothing
 * else: routes and components only ever see `ActivityView` / `CommentView`.
 * See $lib/server/mongodb.ts for the connection helper and the notes on what
 * each of these becomes as a real query.
 */

import {
	type Activity,
	type ActivityView,
	type Comment,
	type CommentView,
	type FeedQuery,
	type NewActivityInput,
	type User
} from '$lib/types';
import { perPersonCents } from '$lib/format';

/* -------------------------------------------------------------------------- */
/* Store                                                                       */
/* -------------------------------------------------------------------------- */

/** Bump this whenever you edit the seed data below so a running dev server re-seeds. */
const SEED_VERSION = 2;

interface Store {
	version: number;
	users: Map<string, User>;
	activities: Map<string, Activity>;
	comments: Comment[];
}

declare global {
	var __tagalongStore: Store | undefined;
}

/** Minutes/hours/days from "now", so seed data never goes stale. */
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
const hoursAgo = (h: number) => hoursFromNow(-h);

function seed(): Store {
	const users: User[] = [
		{
			id: 'u_mei',
			name: 'Mei Tanaka',
			handle: 'mei',
			campus: 'cmu',
			bio: 'Junior in ECE. Perpetually organizing the Costco run.',
			avatarSeed: 0,
			joinedAt: hoursAgo(24 * 240)
		},
		{
			id: 'u_satsuki',
			name: 'Satsuki Kusakabe',
			handle: 'satsuki',
			campus: 'cmu',
			bio: 'Design major. Will absolutely split your Spotify.',
			avatarSeed: 1,
			joinedAt: hoursAgo(24 * 190)
		},
		{
			id: 'u_kanta',
			name: 'Kanta Ogaki',
			handle: 'kanta',
			campus: 'pitt',
			bio: 'Bio pre-med, lives in Oakland, has a car.',
			avatarSeed: 2,
			joinedAt: hoursAgo(24 * 150)
		},
		{
			id: 'u_nori',
			name: 'Nori Alvarez',
			handle: 'nori',
			campus: 'cmu',
			bio: 'CS + stats. Optimizing my grocery budget like a DP problem.',
			avatarSeed: 3,
			joinedAt: hoursAgo(24 * 95)
		},
		{
			id: 'u_pria',
			name: 'Pria Raghunathan',
			handle: 'pria',
			campus: 'chatham',
			bio: 'Env science. Carpool evangelist.',
			avatarSeed: 4,
			joinedAt: hoursAgo(24 * 70)
		},
		{
			id: 'u_dev',
			name: 'Dev Okonkwo',
			handle: 'dev',
			campus: 'duquesne',
			bio: 'Business. Always three people short of a delivery minimum.',
			avatarSeed: 5,
			joinedAt: hoursAgo(24 * 40)
		},
		{
			id: 'u_lin',
			name: 'Lin Zhou',
			handle: 'lin',
			campus: 'pitt',
			bio: 'Materials sci. IKEA trip enthusiast.',
			avatarSeed: 6,
			joinedAt: hoursAgo(24 * 30)
		},
		{
			id: 'u_theo',
			name: 'Theo Marsh',
			handle: 'theo',
			campus: 'cmu',
			bio: 'Drama. Needs a ride to the airport roughly always.',
			avatarSeed: 7,
			joinedAt: hoursAgo(24 * 12)
		}
	];

	const activities: Activity[] = [
		{
			id: 'a_spotify',
			title: 'Spotify Duo — 1 slot left, $6/mo',
			body: "Family plan, 4 of us on it already. Need one more to bring everyone's share down. Venmo monthly, I'll add you the same day. Must be able to set your address to Pittsburgh.",
			category: 'subscriptions',
			campus: 'cmu',
			hostId: 'u_satsuki',
			location: 'Online — Venmo @satsuki',
			startsAt: hoursFromNow(48),
			spots: 6,
			memberIds: ['u_satsuki', 'u_nori', 'u_mei', 'u_theo', 'u_lin'],
			costCents: 600,
			costBasis: 'per-person',
			createdAt: hoursAgo(5)
		},
		{
			id: 'a_costco',
			title: 'Costco run Saturday — I drive, we split gas + membership',
			body: 'Heading out ~10am Saturday, back by 1. Room for 3. Split is gas ($12ish) plus $5 each toward my membership. Bring your own bags, we are not paying for boxes again.',
			category: 'groceries',
			campus: 'cmu',
			hostId: 'u_mei',
			location: "Morewood Ave lot (meet by Tepper's doors)",
			startsAt: hoursFromNow(31),
			spots: 4,
			memberIds: ['u_mei', 'u_nori'],
			costCents: 1700,
			costBasis: 'per-person',
			createdAt: hoursAgo(9)
		},
		{
			id: 'a_airport',
			title: 'PIT airport Uber — Friday 6am, splitting 4 ways',
			body: "Flight is at 8:40 so I'm leaving at 6 sharp. UberXL from Oakland is about $52, which is $13 each if we fill it. I'll book and you Venmo me at the curb.",
			category: 'rides',
			campus: 'pitt',
			hostId: 'u_kanta',
			location: 'Forbes & Bouquet',
			startsAt: hoursFromNow(80),
			spots: 4,
			memberIds: ['u_kanta', 'u_theo', 'u_pria'],
			costCents: 5200,
			costBasis: 'total',
			createdAt: hoursAgo(14)
		},
		{
			id: 'a_ikea',
			title: 'IKEA Robinson haul — need 2 more for the car',
			body: "Getting a desk and a shelf, there's room for two people and their flat-packs. Leaving Sunday noon. Gas split only, no charge for the trunk space.",
			category: 'supplies',
			campus: 'pitt',
			hostId: 'u_lin',
			location: 'Sutherland Hall circle',
			startsAt: hoursFromNow(60),
			spots: 3,
			memberIds: ['u_lin'],
			costCents: 900,
			costBasis: 'per-person',
			createdAt: hoursAgo(20)
		},
		{
			id: 'a_ramen',
			title: 'Hitting the $35 delivery minimum at Ramen Bar',
			body: 'Ordering in ~40 min. I need about $12 more on the ticket to clear the minimum and kill the small-order fee. Drop what you want in the comments, meet in the Donner lounge.',
			category: 'food',
			campus: 'cmu',
			hostId: 'u_theo',
			location: 'Donner House lounge',
			startsAt: hoursFromNow(1),
			spots: 5,
			memberIds: ['u_theo', 'u_satsuki'],
			costCents: 3500,
			costBasis: 'total',
			createdAt: hoursAgo(1)
		},
		{
			id: 'a_giant_eagle',
			title: 'Weekly Giant Eagle walk — produce split',
			body: 'Every Tuesday. We buy the big bags of produce and divide them up on the walk back. Way cheaper than buying singles and nothing rots before you eat it.',
			category: 'groceries',
			campus: 'cmu',
			hostId: 'u_nori',
			location: 'Giant Eagle, Shadyside',
			startsAt: hoursFromNow(26),
			spots: 6,
			memberIds: ['u_nori', 'u_mei', 'u_satsuki', 'u_theo'],
			costCents: 0,
			costBasis: 'per-person',
			createdAt: hoursAgo(30)
		},
		{
			id: 'a_nyt',
			title: 'NYT + Games group sub, $2.50 each',
			body: 'Have 3 of 5 seats filled on the group subscription. Includes Cooking and Games. Annual, so it is one Venmo and then you forget about it.',
			category: 'subscriptions',
			campus: 'duquesne',
			hostId: 'u_dev',
			location: 'Online',
			startsAt: hoursFromNow(120),
			spots: 5,
			memberIds: ['u_dev', 'u_kanta', 'u_pria'],
			costCents: 250,
			costBasis: 'per-person',
			createdAt: hoursAgo(36)
		},
		{
			id: 'a_laundry',
			title: 'Laundromat carpool + detergent bulk split',
			body: 'The machines in my building eat quarters. Driving to the laundromat on Murray, and a Costco-size detergent split four ways is roughly nothing per load.',
			category: 'errands',
			campus: 'chatham',
			hostId: 'u_pria',
			location: 'Murray Ave laundromat',
			startsAt: hoursFromNow(52),
			spots: 4,
			memberIds: ['u_pria', 'u_dev'],
			costCents: 800,
			costBasis: 'per-person',
			createdAt: hoursAgo(44)
		},
		{
			id: 'a_textbook',
			title: 'Splitting the 21-241 textbook rental',
			body: 'Rental is $60 for the semester. Two of us can share — I need it Mon/Wed, you take it Tue/Thu/weekend. Has worked fine for me twice now.',
			category: 'supplies',
			campus: 'cmu',
			hostId: 'u_nori',
			location: 'Hunt Library, 2nd floor',
			startsAt: hoursFromNow(18),
			spots: 2,
			memberIds: ['u_nori', 'u_mei'],
			costCents: 6000,
			costBasis: 'total',
			createdAt: hoursAgo(52)
		},
		{
			id: 'a_farmers',
			title: 'Squirrel Hill farmers market — bulk eggs & bread',
			body: 'The stands do way better prices by the dozen/loaf if you buy a lot. Four of us clears the bulk tier easily. Sunday morning, walkable from campus.',
			category: 'groceries',
			campus: 'cmu',
			hostId: 'u_satsuki',
			location: 'Beacon St lot, Squirrel Hill',
			startsAt: hoursFromNow(70),
			spots: 5,
			memberIds: ['u_satsuki', 'u_lin', 'u_nori'],
			costCents: 1200,
			costBasis: 'per-person',
			createdAt: hoursAgo(66)
		},
		{
			id: 'a_free_pizza',
			title: 'Free pizza — leftovers from the SCS town hall',
			body: 'Six untouched boxes in the Gates 6th floor kitchen. First come first served. Bring a container if you want to take slices back.',
			category: 'food',
			campus: 'cmu',
			hostId: 'u_theo',
			location: 'Gates 6th floor kitchen',
			startsAt: hoursFromNow(2),
			spots: 12,
			memberIds: ['u_theo', 'u_satsuki', 'u_nori'],
			costCents: 0,
			costBasis: 'per-person',
			createdAt: hoursAgo(0.5)
		},
		{
			id: 'a_free_couch',
			title: 'Free couch + two lamps, moving out Sunday',
			body: "Grey IKEA loveseat, no stains, and two floor lamps. You haul, you keep. I'm on the 2nd floor with no elevator, so bring a friend.",
			category: 'supplies',
			campus: 'pitt',
			hostId: 'u_lin',
			location: 'Atwood St, Oakland',
			startsAt: hoursFromNow(58),
			spots: 2,
			memberIds: ['u_lin'],
			costCents: 0,
			costBasis: 'per-person',
			createdAt: hoursAgo(3)
		}
	];

	const comments: Comment[] = [
		{
			id: 'c_1',
			activityId: 'a_costco',
			authorId: 'u_theo',
			body: 'Is there room for a case of seltzer or are we tight on trunk space?',
			createdAt: hoursAgo(7)
		},
		{
			id: 'c_2',
			activityId: 'a_costco',
			authorId: 'u_mei',
			body: 'Trunk is fine, back seat is the tight part. Seltzer is welcome.',
			createdAt: hoursAgo(6)
		},
		{
			id: 'c_3',
			activityId: 'a_spotify',
			authorId: 'u_nori',
			body: 'Can confirm, been on this plan since March and it has never broken.',
			createdAt: hoursAgo(4)
		},
		{
			id: 'c_4',
			activityId: 'a_airport',
			authorId: 'u_pria',
			body: 'In. I only have a carry-on so the trunk is all yours.',
			createdAt: hoursAgo(11)
		},
		{
			id: 'c_5',
			activityId: 'a_ramen',
			authorId: 'u_satsuki',
			body: 'Spicy miso + gyoza for me, sending $14 now.',
			createdAt: hoursAgo(1)
		}
	];

	return {
		version: SEED_VERSION,
		users: new Map(users.map((u) => [u.id, u])),
		activities: new Map(activities.map((a) => [a.id, a])),
		comments
	};
}

/* Persist across Vite HMR so editing a route does not wipe the demo data —
   unless the seed itself changed, in which case start fresh. */
if (globalThis.__tagalongStore?.version !== SEED_VERSION) globalThis.__tagalongStore = seed();
const store: Store = globalThis.__tagalongStore;

/** The signed-in user while auth is stubbed. See hooks.server.ts. */
export const DEMO_USER_ID = 'u_mei';

/* -------------------------------------------------------------------------- */
/* Serialisation — the one place the stored shape becomes the wire shape        */
/* -------------------------------------------------------------------------- */

function requireUser(id: string): User {
	const user = store.users.get(id);
	if (user) return user;
	// Defensive: a deleted user should not blank out a whole feed.
	return {
		id,
		name: 'Deleted user',
		handle: 'deleted',
		campus: 'cmu',
		bio: '',
		avatarSeed: 0,
		joinedAt: new Date(0).toISOString()
	};
}

export function toView(activity: Activity, viewerId?: string): ActivityView {
	const members = activity.memberIds.map(requireUser);
	const spotsTaken = activity.memberIds.length;

	return {
		id: activity.id,
		title: activity.title,
		body: activity.body,
		category: activity.category,
		campus: activity.campus,
		location: activity.location,
		startsAt: activity.startsAt,
		spots: activity.spots,
		costCents: activity.costCents,
		costBasis: activity.costBasis,
		createdAt: activity.createdAt,
		host: requireUser(activity.hostId),
		members,
		commentCount: store.comments.filter((c) => c.activityId === activity.id).length,
		spotsTaken,
		spotsLeft: Math.max(0, activity.spots - spotsTaken),
		isFull: spotsTaken >= activity.spots,
		joined: viewerId ? activity.memberIds.includes(viewerId) : false,
		isHost: viewerId ? activity.hostId === viewerId : false
	};
}

function toCommentView(comment: Comment): CommentView {
	return {
		id: comment.id,
		body: comment.body,
		createdAt: comment.createdAt,
		author: requireUser(comment.authorId)
	};
}

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

export function getUser(id: string): User | null {
	return store.users.get(id) ?? null;
}

export function listUsers(): User[] {
	return [...store.users.values()];
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The feed. Filtering happens here so every caller (page load + JSON API) gets
 * identical results.
 *
 * As a Mongo query this is roughly:
 *   db.activities.find({ campus, category, $text: { $search: q } })
 *                .sort({ startsAt: 1 })
 */
export function listActivities(query: FeedQuery = {}, viewerId?: string): ActivityView[] {
	const needle = query.q?.trim().toLowerCase();

	let rows = [...store.activities.values()];

	if (query.campus) rows = rows.filter((a) => a.campus === query.campus);
	if (query.category) rows = rows.filter((a) => a.category === query.category);
	if (query.free) rows = rows.filter((a) => a.costCents === 0);
	if (needle) {
		rows = rows.filter((a) => `${a.title} ${a.body} ${a.location}`.toLowerCase().includes(needle));
	}

	// "Cheapest" ranks by what one person pays if the group fills.
	const perHead = (a: Activity) => perPersonCents(a.costCents, a.costBasis, a.spots);
	const sort = query.sort ?? 'soonest';
	rows.sort((a, b) => {
		if (sort === 'new') return b.createdAt.localeCompare(a.createdAt);
		if (sort === 'cheapest') return perHead(a) - perHead(b) || a.startsAt.localeCompare(b.startsAt);
		return a.startsAt.localeCompare(b.startsAt);
	});

	return rows.map((a) => toView(a, viewerId));
}

export function getActivity(id: string, viewerId?: string): ActivityView | null {
	const activity = store.activities.get(id);
	return activity ? toView(activity, viewerId) : null;
}

export function listComments(activityId: string): CommentView[] {
	return store.comments
		.filter((c) => c.activityId === activityId)
		.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
		.map(toCommentView);
}

export function activitiesHostedBy(userId: string, viewerId?: string): ActivityView[] {
	return [...store.activities.values()]
		.filter((a) => a.hostId === userId)
		.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
		.map((a) => toView(a, viewerId));
}

export function activitiesJoinedBy(userId: string, viewerId?: string): ActivityView[] {
	return [...store.activities.values()]
		.filter((a) => a.hostId !== userId && a.memberIds.includes(userId))
		.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
		.map((a) => toView(a, viewerId));
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                      */
/* -------------------------------------------------------------------------- */

export function createActivity(input: NewActivityInput, hostId: string): ActivityView {
	const activity: Activity = {
		id: `a_${crypto.randomUUID().slice(0, 8)}`,
		title: input.title,
		body: input.body,
		category: input.category,
		campus: input.campus,
		hostId,
		location: input.location,
		startsAt: input.startsAt,
		spots: input.spots,
		memberIds: [hostId], // the host occupies one spot
		costCents: input.costCents,
		costBasis: input.costBasis,
		createdAt: new Date().toISOString()
	};

	store.activities.set(activity.id, activity);
	return toView(activity, hostId);
}

export type JoinResult =
	| { ok: true; activity: ActivityView }
	| { ok: false; reason: 'not-found' | 'full' | 'already-joined' };

/**
 * Join, guarding against overbooking.
 *
 * In Mongo this MUST stay a single atomic findOneAndUpdate with the capacity
 * check inside the filter — read-then-write lets two simultaneous joins both
 * see the last open spot:
 *
 *   findOneAndUpdate(
 *     { _id, $expr: { $lt: [{ $size: '$memberIds' }, '$spots'] }, memberIds: { $ne: userId } },
 *     { $push: { memberIds: userId } },
 *     { returnDocument: 'after' }
 *   )
 */
export function joinActivity(id: string, userId: string): JoinResult {
	const activity = store.activities.get(id);
	if (!activity) return { ok: false, reason: 'not-found' };
	if (activity.memberIds.includes(userId)) return { ok: false, reason: 'already-joined' };
	if (activity.memberIds.length >= activity.spots) return { ok: false, reason: 'full' };

	activity.memberIds.push(userId);
	return { ok: true, activity: toView(activity, userId) };
}

export type LeaveResult =
	| { ok: true; activity: ActivityView }
	| { ok: false; reason: 'not-found' | 'not-a-member' | 'host-cannot-leave' };

export function leaveActivity(id: string, userId: string): LeaveResult {
	const activity = store.activities.get(id);
	if (!activity) return { ok: false, reason: 'not-found' };
	if (activity.hostId === userId) return { ok: false, reason: 'host-cannot-leave' };
	if (!activity.memberIds.includes(userId)) return { ok: false, reason: 'not-a-member' };

	activity.memberIds = activity.memberIds.filter((m) => m !== userId);
	return { ok: true, activity: toView(activity, userId) };
}

export function addComment(activityId: string, authorId: string, body: string): CommentView | null {
	if (!store.activities.has(activityId)) return null;

	const comment: Comment = {
		id: `c_${crypto.randomUUID().slice(0, 8)}`,
		activityId,
		authorId,
		body,
		createdAt: new Date().toISOString()
	};

	store.comments.push(comment);
	return toCommentView(comment);
}
