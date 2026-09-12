import type {
	AccountType,
	ActivityPatch,
	ActivityView,
	CampusId,
	CommentVisibility,
	GrassRank,
	HostStanding,
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
	/** Both drive who may see student-only activities. */
	campus?: CampusId;
	accountType?: AccountType;
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
	| { ok: false; reason: 'not-found' | 'full' | 'already-joined' | 'needs-approval' };

export type WaitlistResult =
	| { ok: true; activity: ActivityView }
	| {
			ok: false;
			reason: 'not-found' | 'open' | 'already-joined' | 'already-waiting' | 'not-waiting';
	  };

/** Only the host can say it happened, and only once it has started. */
export type CompleteResult =
	| { ok: true; activity: ActivityView }
	| { ok: false; reason: 'not-found' | 'not-host' | 'not-started' };

/** Editing is the host's call, and can't strand people who already joined. */
export type UpdateResult =
	| { ok: true; activity: ActivityView }
	| { ok: false; reason: 'not-found' | 'not-host' | 'too-few-spots' };

/** Approving is the host's call, so it can also fail on permission. */
export type ApprovalResult =
	| { ok: true; activity: ActivityView; addedSpot: boolean }
	| { ok: false; reason: 'not-found' | 'not-host' | 'not-waiting' };

export type RateResult =
	| { ok: true }
	| {
			ok: false;
			reason: 'not-found' | 'not-attended' | 'not-yet' | 'already-rated' | 'bad-score';
	  };

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
	/** Look someone up by their @handle, which is what public profile URLs use. */
	getUserByHandle(handle: string): Promise<User | null>;
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
	/**
	 * Everything this user hosts / has joined, with no visibility filtering:
	 * these are a privileged read, for their own pages and for counting their
	 * grass honestly. A page showing one person's activities to someone else
	 * must filter the result itself. See /u/[handle].
	 */
	activitiesHostedBy(userId: string, viewer?: Viewer): Promise<ActivityView[]>;
	activitiesJoinedBy(userId: string, viewer?: Viewer): Promise<ActivityView[]>;
	/**
	 * Completed-activity counts per user, highest first. Drives the "Top grass
	 * toucher" badge, so it counts the same things the garden does.
	 */
	grassLeaderboard(limit?: number): Promise<{ userId: string; score: number }[]>;
	/** Where one person places among everyone who has touched grass. */
	grassRank(userId: string): Promise<GrassRank>;
	/**
	 * Record badges as congratulated, returning only the ones that weren't
	 * already. The caller shows a celebration for what comes back, so this has
	 * to be the thing that decides: two tabs loading at once must not both
	 * think they're first.
	 */
	markBadgesSeen(userId: string, badgeIds: string[]): Promise<string[]>;

	createActivity(input: NewActivityInput, hostId: string): Promise<ActivityView>;
	/**
	 * Host changes their own activity — more spots, a new time, public to
	 * private. Refuses to cut `spots` below the people already in.
	 */
	updateActivity(id: string, hostId: string, patch: ActivityPatch): Promise<UpdateResult>;
	/**
	 * Host confirms it happened, which is what makes it count as grass for
	 * everyone who was in. `complete: false` undoes it.
	 */
	completeActivity(id: string, hostId: string, complete?: boolean): Promise<CompleteResult>;
	joinActivity(id: string, userId: string): Promise<JoinResult>;
	leaveActivity(id: string, userId: string): Promise<LeaveResult>;
	/** Ask the host for a spot — because it's full, or because they vet everyone. */
	joinWaitlist(id: string, userId: string): Promise<WaitlistResult>;
	/** Withdraw that request. */
	leaveWaitlist(id: string, userId: string): Promise<WaitlistResult>;
	/** Host lets someone in. Takes a free spot, or adds one if there are none. */
	approveWaitlist(id: string, hostId: string, userId: string): Promise<ApprovalResult>;
	/** Host turns a request down. */
	declineWaitlist(id: string, hostId: string, userId: string): Promise<ApprovalResult>;
	/** Leave an anonymous score. Only attendees of a past activity may. */
	rateActivity(activityId: string, raterId: string, score: number): Promise<RateResult>;
	/** How a host is doing, and whether they've crossed the warning line. */
	hostStanding(hostId: string): Promise<HostStanding>;

	/** `visibility` defaults to 'everyone'. */
	addComment(
		activityId: string,
		authorId: string,
		body: string,
		visibility?: CommentVisibility
	): Promise<CommentView | null>;
}
