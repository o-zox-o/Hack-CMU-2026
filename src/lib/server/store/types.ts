import type {
	ActivityView,
	CommentView,
	FeedQuery,
	LatLng,
	NewActivityInput,
	SignupInput,
	User
} from '$lib/types';

/**
 * Who's asking. `id` drives joined/isHost; `location` drives distances and
 * the radius filter. Build one from `locals` in a route and pass it through.
 */
export interface Viewer {
	id: string;
	location?: LatLng;
	/** From the signup survey — drives the "For you" ordering. */
	interests?: string[];
}

/** The parts of a profile someone can edit. Any field left out is untouched. */
export interface ProfilePatch {
	bio?: string;
	interests?: string[];
	isPrivate?: boolean;
}

export interface CommentThread {
	visible: CommentView[];
	hidden: number;
}

export type SignupResult = { ok: true; user: User } | { ok: false; reason: 'email-taken' };

export type JoinResult =
	| { ok: true; activity: ActivityView }
	| { ok: false; reason: 'not-found' | 'full' | 'already-joined' };

export type WaitlistResult =
	| { ok: true; activity: ActivityView }
	| {
			ok: false;
			reason: 'not-found' | 'not-full' | 'already-joined' | 'already-waiting' | 'not-waiting';
	  };

/** Approving is the host's call, so it can also fail on permission. */
export type ApprovalResult =
	| { ok: true; activity: ActivityView; addedSpot: boolean }
	| { ok: false; reason: 'not-found' | 'not-host' | 'not-waiting' };

export type LeaveResult =
	| { ok: true; activity: ActivityView }
	| { ok: false; reason: 'not-found' | 'not-a-member' | 'host-cannot-leave' };

/**
 * Everything the app needs from persistence. Two implementations:
 *   store/memory.ts — Maps in process memory. Zero setup; resets on restart.
 *   store/mongo.ts  — MongoDB. What you deploy with.
 * db.ts picks one based on MONGODB_URI. Routes never know which.
 */
export interface Store {
	getUser(id: string): Promise<User | null>;
	/**
	 * The user plus every interest that should shape their feed — what they
	 * picked, plus what they've been learned to like. One read, because hooks
	 * needs both on every request.
	 */
	getSessionUser(id: string): Promise<{ user: User; interests: string[] } | null>;
	/** Recompute learned interests from what this person has joined. */
	refreshLearnedInterests(userId: string): Promise<void>;
	/** A user's email address. Server-only — it never appears in a view. */
	getUserEmail(id: string): Promise<string | null>;
	verifyLogin(email: string, password: string): Promise<User | null>;
	createUser(input: SignupInput): Promise<SignupResult>;
	updateProfile(userId: string, patch: ProfilePatch): Promise<User | null>;

	listActivities(query?: FeedQuery, viewer?: Viewer): Promise<ActivityView[]>;
	getActivity(id: string, viewer?: Viewer): Promise<ActivityView | null>;
	/**
	 * Comments on an activity, with private authors' comments withheld from
	 * anyone who hasn't joined it. `hidden` is how many were withheld, so the
	 * page can say so without revealing who wrote them.
	 */
	listComments(activityId: string, viewerId?: string): Promise<CommentThread>;
	activitiesHostedBy(userId: string, viewer?: Viewer): Promise<ActivityView[]>;
	activitiesJoinedBy(userId: string, viewer?: Viewer): Promise<ActivityView[]>;
	/** Activity counts per user, highest first — drives the "Top grass toucher" badge. */
	grassLeaderboard(limit?: number): Promise<{ userId: string; score: number }[]>;

	createActivity(input: NewActivityInput, hostId: string): Promise<ActivityView>;
	joinActivity(id: string, userId: string): Promise<JoinResult>;
	leaveActivity(id: string, userId: string): Promise<LeaveResult>;
	/** Ask to join something that's already full. */
	joinWaitlist(id: string, userId: string): Promise<WaitlistResult>;
	/** Withdraw that request. */
	leaveWaitlist(id: string, userId: string): Promise<WaitlistResult>;
	/** Host lets someone in. Takes a free spot, or adds one if there are none. */
	approveWaitlist(id: string, hostId: string, userId: string): Promise<ApprovalResult>;
	/** Host turns a request down. */
	declineWaitlist(id: string, hostId: string, userId: string): Promise<ApprovalResult>;
	addComment(activityId: string, authorId: string, body: string): Promise<CommentView | null>;
}
