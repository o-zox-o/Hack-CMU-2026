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
}

export type SignupResult = { ok: true; user: User } | { ok: false; reason: 'email-taken' };

export type JoinResult =
	| { ok: true; activity: ActivityView }
	| { ok: false; reason: 'not-found' | 'full' | 'already-joined' };

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
	/** A user's email address. Server-only — it never appears in a view. */
	getUserEmail(id: string): Promise<string | null>;
	verifyLogin(email: string, password: string): Promise<User | null>;
	createUser(input: SignupInput): Promise<SignupResult>;

	listActivities(query?: FeedQuery, viewer?: Viewer): Promise<ActivityView[]>;
	getActivity(id: string, viewer?: Viewer): Promise<ActivityView | null>;
	listComments(activityId: string): Promise<CommentView[]>;
	activitiesHostedBy(userId: string, viewer?: Viewer): Promise<ActivityView[]>;
	activitiesJoinedBy(userId: string, viewer?: Viewer): Promise<ActivityView[]>;

	createActivity(input: NewActivityInput, hostId: string): Promise<ActivityView>;
	joinActivity(id: string, userId: string): Promise<JoinResult>;
	leaveActivity(id: string, userId: string): Promise<LeaveResult>;
	addComment(activityId: string, authorId: string, body: string): Promise<CommentView | null>;
}
