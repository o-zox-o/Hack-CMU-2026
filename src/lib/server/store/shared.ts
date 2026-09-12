/**
 * Backend-agnostic pieces: turning stored docs into wire views, building new
 * docs, and the in-process part of feed filtering. Both stores use these so
 * they can't drift apart.
 */

import { perPersonCents } from '$lib/format';
import { campusesWithin, distanceToCampus } from '$lib/geo';
import { interleaveWildcards, matchPercent, rankByRelevance, seededShuffle } from '$lib/matching';
import {
	BAD_SCORE,
	CATEGORY_INTERESTS,
	isStudent,
	MIN_RATINGS_TO_SHOW,
	WARNING_THRESHOLD,
	type CommentVisibility,
	type HostStanding,
	type RatingSummary
} from '$lib/types';
import type {
	Activity,
	ActivityPatch,
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
		accountType: input.accountType,
		interests: input.interests,
		isPrivate: false,
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
		visibility: input.visibility,
		approvalRequired: input.approvalRequired,
		costCents: input.costCents,
		costBasis: input.costBasis,
		// Untagged activities inherit their category's tags so they can still
		// be matched against someone's interests.
		interests: CATEGORY_INTERESTS[input.category] ?? [],
		createdAt: new Date().toISOString()
	};
}

export function newCommentDoc(
	activityId: string,
	authorId: string,
	body: string,
	visibility: CommentVisibility = 'everyone'
): Comment {
	return {
		id: `c_${crypto.randomUUID().slice(0, 8)}`,
		activityId,
		authorId,
		body,
		visibility,
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
	viewer?: Viewer,
	rating: RatingSummary = { count: 0, average: null, rated: false, canRate: false }
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
		// Both default for activities posted before hosts could choose.
		visibility: activity.visibility ?? 'public',
		approvalRequired: activity.approvalRequired ?? false,
		completedAt: activity.completedAt ?? null,
		isComplete: Boolean(activity.completedAt),
		awaitingCompletion: !activity.completedAt && new Date(activity.startsAt).getTime() < Date.now(),
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
		isWildcard: wildcards.has(activity.id),
		rating,
		interests: activity.interests
	};
}

/**
 * Who a comment is really for. The comment's own setting wins; a comment
 * written before that was a choice falls back to the author's profile-wide
 * flag, which is what it meant at the time.
 */
export function commentVisibility(comment: Comment, author: User | undefined): CommentVisibility {
	return comment.visibility ?? (author?.isPrivate ? 'members' : 'everyone');
}

/**
 * Can `viewer` read this comment? A members-only comment is for the people in
 * the activity — plus its author, who can always see their own.
 */
export function canSeeComment(
	comment: Comment,
	author: User | undefined,
	viewerId: string | undefined,
	viewerIsMember: boolean
): boolean {
	if (commentVisibility(comment, author) === 'everyone') return true;
	if (viewerId && comment.authorId === viewerId) return true;
	return viewerIsMember;
}

export function toCommentView(comment: Comment, users: Map<string, User>): CommentView {
	const author = users.get(comment.authorId);
	return {
		id: comment.id,
		body: comment.body,
		createdAt: comment.createdAt,
		visibility: commentVisibility(comment, author),
		author: author ?? fallbackUser(comment.authorId)
	};
}

/* ---- host controls ---------------------------------------------------------- */

/** Host, member, or waiting on the host. Anyone already involved sees it. */
export function isInvolved(activity: Activity, viewerId?: string): boolean {
	if (!viewerId) return false;
	return (
		activity.hostId === viewerId ||
		activity.memberIds.includes(viewerId) ||
		(activity.waitlistIds ?? []).includes(viewerId)
	);
}

/**
 * May this viewer open the activity at all?
 *
 * The student-only tiers are a real wall, not just a feed filter: a general
 * account handed the link to a campus activity still can't read it. Private
 * is the opposite kind of restriction, unlisted rather than sealed, so the
 * link works for whoever the host sends it to.
 *
 * Anyone already involved always gets through, whatever the setting became
 * after they joined.
 */
export function canOpenActivity(activity: Activity, viewer?: Viewer): boolean {
	if (isInvolved(activity, viewer?.id)) return true;

	const visibility = activity.visibility ?? 'public';
	if (visibility === 'public' || visibility === 'private') return true;
	if (!isStudent(viewer)) return false;
	return visibility === 'students' || viewer?.campus === activity.campus;
}

/**
 * Does this activity belong in the browse feed for this viewer? Everything
 * they may open, minus the private ones, which are found by link alone.
 *
 * Mongo can't call this, so it builds the same rule as a query filter in
 * `listActivities`. Change one and change the other.
 */
export function isListed(activity: Activity, viewer?: Viewer): boolean {
	if (isInvolved(activity, viewer?.id)) return true;
	if ((activity.visibility ?? 'public') === 'private') return false;
	return canOpenActivity(activity, viewer);
}

/** Is a join a request the host has to answer, rather than just walking in? */
export function needsApproval(activity: Activity): boolean {
	return Boolean(activity.approvalRequired) || activity.memberIds.length >= activity.spots;
}

/**
 * Turn an edit into the fields to write. Only what the host actually supplied,
 * plus the tags that hang off the category — those are derived, never typed,
 * so a recategorised activity has to be re-tagged or it keeps matching the
 * wrong people's feeds.
 */
export function activityUpdates(patch: ActivityPatch): Partial<Activity> {
	const updates: Partial<Activity> = Object.fromEntries(
		Object.entries(patch).filter(([, v]) => v !== undefined)
	);
	if (patch.category !== undefined) {
		updates.interests = CATEGORY_INTERESTS[patch.category] ?? [];
	}
	return updates;
}

/* ---- ratings ----------------------------------------------------------------- */

/**
 * What the UI is allowed to know about an activity's ratings: a count, an
 * average once enough people have rated that no single score is identifiable,
 * and whether this viewer may rate. Never the individual scores, never who.
 */
export function ratingSummary(
	scores: number[],
	activity: Activity,
	viewerId: string | undefined,
	viewerHasRated: boolean,
	now = Date.now()
): RatingSummary {
	const happened = new Date(activity.startsAt).getTime() < now;
	const attended = Boolean(viewerId && activity.memberIds.includes(viewerId));

	return {
		count: scores.length,
		average:
			scores.length >= MIN_RATINGS_TO_SHOW
				? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
				: null,
		rated: viewerHasRated,
		canRate: happened && attended && !viewerHasRated
	};
}

/** Fold a host's per-activity averages into a standing, warning included. */
export function hostStandingFrom(hosted: number, averages: number[]): HostStanding {
	const poorlyRated = averages.filter((a) => a <= BAD_SCORE).length;
	return {
		hosted,
		ratedActivities: averages.length,
		poorlyRated,
		average:
			averages.length > 0
				? Math.round((averages.reduce((a, b) => a + b, 0) / averages.length) * 10) / 10
				: null,
		warned: poorlyRated >= WARNING_THRESHOLD
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
/**
 * Ids the last searchAndSort() marked as wildcards. Read it straight after the
 * call — it's the simplest way to get the flag onto the views without threading
 * a second return value through every backend.
 */
export let wildcards = new Set<string>();

export function searchAndSort(rows: Activity[], query: FeedQuery, viewer?: Viewer): Activity[] {
	wildcards = new Set();

	const needle = query.q?.trim().toLowerCase();
	if (needle) {
		rows = rows.filter((a) => `${a.title} ${a.body} ${a.location}`.toLowerCase().includes(needle));
	}

	// "Cheapest" ranks by what one person pays if the group fills.
	const perHead = (a: Activity) => perPersonCents(a.costCents, a.costBasis, a.spots);
	const miles = (a: Activity) =>
		viewer?.location ? distanceToCampus(viewer.location, a.campus) : 0;
	const sort = query.sort ?? 'foryou';

	// Shuffles per viewer per hour: stable while you browse, different later.
	const seed = `${viewer?.id ?? 'anon'}:${Math.floor(Date.now() / 3_600_000)}`;

	if (sort === 'random') return seededShuffle(rows, seed);

	// The default feed is ranked against the viewer, not the clock — then a
	// wildcard is slipped in every few rows so it doesn't only ever agree.
	if (sort === 'foryou') {
		const ranked = rankByRelevance(
			{ interests: viewer?.interests, location: viewer?.location },
			rows
		);
		const { items, wildcardIds } = interleaveWildcards(ranked, seed);
		wildcards = wildcardIds;
		return items;
	}

	return [...rows].sort((a, b) => {
		if (sort === 'new') return b.createdAt.localeCompare(a.createdAt);
		if (sort === 'cheapest') return perHead(a) - perHead(b) || a.startsAt.localeCompare(b.startsAt);
		if (sort === 'nearest') return miles(a) - miles(b) || a.startsAt.localeCompare(b.startsAt);
		return a.startsAt.localeCompare(b.startsAt);
	});
}
