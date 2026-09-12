/**
 * Backend-agnostic pieces: turning stored docs into wire views, building new
 * docs, and the in-process part of feed filtering. Both stores use these so
 * they can't drift apart.
 */

import { perPersonCents } from '$lib/format';
import { campusesWithin, distanceToCampus } from '$lib/geo';
import { matchPercent, rankByRelevance } from '$lib/matching';
import { CATEGORY_INTERESTS } from '$lib/types';
import type {
	Activity,
	ActivityView,
	Comment,
	CommentView,
	FeedQuery,
	NewActivityInput,
	SignupInput,
	User,
	UserDoc
} from '$lib/types';
import { hashPassword } from '../auth';
import type { Viewer } from './types';

/* ---- users ---------------------------------------------------------------- */

/** Strip credentials — the only way a stored user becomes a public one. */
export function toUser(doc: UserDoc): User {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { email, passwordHash, ...user } = doc;
	return user;
}

/** A deleted user should not blank out a whole feed. */
export function fallbackUser(id: string): User {
	return {
		id,
		name: 'Deleted user',
		handle: 'deleted',
		campus: 'cmu',
		location: '',
		interests: [],
		bio: '',
		avatarSeed: 0,
		joinedAt: new Date(0).toISOString()
	};
}

/** Handle from the email's local part, e.g. "mei.tanaka@…" -> "meitanaka". */
export function handleBase(email: string): string {
	return (
		email
			.split('@')[0]
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '')
			.slice(0, 20) || 'user'
	);
}

export function newUserDoc(input: SignupInput, handle: string, avatarSeed: number): UserDoc {
	return {
		id: `u_${crypto.randomUUID().slice(0, 8)}`,
		name: input.name,
		handle,
		email: input.email.toLowerCase(),
		passwordHash: hashPassword(input.password),
		campus: input.campus,
		location: '',
		interests: input.interests,
		bio: '',
		avatarSeed,
		joinedAt: new Date().toISOString()
	};
}

/* ---- activities ------------------------------------------------------------ */

export function newActivityDoc(input: NewActivityInput, hostId: string): Activity {
	return {
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
		waitlistIds: [],
		costCents: input.costCents,
		costBasis: input.costBasis,
		// Untagged activities inherit their category's tags so they can still
		// be matched against someone's interests.
		interests: CATEGORY_INTERESTS[input.category] ?? [],
		createdAt: new Date().toISOString()
	};
}

export function newCommentDoc(activityId: string, authorId: string, body: string): Comment {
	return {
		id: `c_${crypto.randomUUID().slice(0, 8)}`,
		activityId,
		authorId,
		body,
		createdAt: new Date().toISOString()
	};
}

/** Every user id an activity list refers to (hosts + members), deduplicated. */
export function referencedUserIds(rows: Activity[]): string[] {
	const ids = new Set<string>();
	for (const a of rows) {
		ids.add(a.hostId);
		for (const m of a.memberIds) ids.add(m);
		for (const w of a.waitlistIds ?? []) ids.add(w);
	}
	return [...ids];
}

/** Stored activity -> wire view. `users` must already contain everyone referenced. */
export function toView(
	activity: Activity,
	users: Map<string, User>,
	commentCount: number,
	viewer?: Viewer
): ActivityView {
	const user = (id: string) => users.get(id) ?? fallbackUser(id);
	const spotsTaken = activity.memberIds.length;
	const viewerId = viewer?.id;

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
		host: user(activity.hostId),
		members: activity.memberIds.map(user),
		waitlist: (activity.waitlistIds ?? []).map(user),
		commentCount,
		distanceMiles: viewer?.location ? distanceToCampus(viewer.location, activity.campus) : null,
		matchPercent: matchPercent(
			{ interests: viewer?.interests, location: viewer?.location },
			activity
		),
		spotsTaken,
		spotsLeft: Math.max(0, activity.spots - spotsTaken),
		isFull: spotsTaken >= activity.spots,
		joined: viewerId ? activity.memberIds.includes(viewerId) : false,
		onWaitlist: viewerId ? (activity.waitlistIds ?? []).includes(viewerId) : false,
		isHost: viewerId ? activity.hostId === viewerId : false,
		interests: activity.interests
	};
}

export function toCommentView(comment: Comment, users: Map<string, User>): CommentView {
	return {
		id: comment.id,
		body: comment.body,
		createdAt: comment.createdAt,
		author: users.get(comment.authorId) ?? fallbackUser(comment.authorId)
	};
}

/* ---- feed filtering ------------------------------------------------------------ */

/**
 * Campus ids the feed should include, or null for "no campus restriction".
 * Mongo turns this into `{ campus: { $in } }`; memory filters in-process.
 */
export function campusScope(query: FeedQuery, viewer?: Viewer): string[] | null {
	if (query.campus) return [query.campus];
	if (query.within && query.within !== 'all' && viewer?.location) {
		return campusesWithin(viewer.location, query.within);
	}
	return null;
}

/** The parts of a feed query both backends apply in process: text search + sort. */
export function searchAndSort(rows: Activity[], query: FeedQuery, viewer?: Viewer): Activity[] {
	const needle = query.q?.trim().toLowerCase();
	if (needle) {
		rows = rows.filter((a) => `${a.title} ${a.body} ${a.location}`.toLowerCase().includes(needle));
	}

	// "Cheapest" ranks by what one person pays if the group fills.
	const perHead = (a: Activity) => perPersonCents(a.costCents, a.costBasis, a.spots);
	const miles = (a: Activity) =>
		viewer?.location ? distanceToCampus(viewer.location, a.campus) : 0;
	const sort = query.sort ?? 'foryou';

	// The default feed is ranked against the viewer, not the clock.
	if (sort === 'foryou') {
		return rankByRelevance({ interests: viewer?.interests, location: viewer?.location }, rows);
	}

	return [...rows].sort((a, b) => {
		if (sort === 'new') return b.createdAt.localeCompare(a.createdAt);
		if (sort === 'cheapest') return perHead(a) - perHead(b) || a.startsAt.localeCompare(b.startsAt);
		if (sort === 'nearest') return miles(a) - miles(b) || a.startsAt.localeCompare(b.startsAt);
		return a.startsAt.localeCompare(b.startsAt);
	});
}
