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
import { getDb } from '$lib/server/mongodb';

export const DEMO_USER_ID = 'u_mei';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

async function requireUser(id: string): Promise<User> {
	const db = await getDb();

	const user = await db.collection<User>('users').findOne({ id });

	if (user) {
		return user;
	}

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

export async function toView(
	activity: Activity,
	viewerId?: string
): Promise<ActivityView> {
	const db = await getDb();

	const members = await Promise.all(
		activity.memberIds.map((id) => requireUser(id))
	);

	const host = await requireUser(activity.hostId);

	const commentCount = await db
		.collection<Comment>('comments')
		.countDocuments({ activityId: activity.id });

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

		host,
		members,
		commentCount,

		spotsTaken,
		spotsLeft: Math.max(0, activity.spots - spotsTaken),

		isFull: spotsTaken >= activity.spots,
		joined: viewerId ? activity.memberIds.includes(viewerId) : false,
		isHost: viewerId ? activity.hostId === viewerId : false
	};
}

async function toCommentView(comment: Comment): Promise<CommentView> {
	return {
		id: comment.id,
		body: comment.body,
		createdAt: comment.createdAt,
		author: await requireUser(comment.authorId)
	};
}

/* -------------------------------------------------------------------------- */
/* Users                                                                      */
/* -------------------------------------------------------------------------- */

export async function getUser(id: string): Promise<User | null> {
	const db = await getDb();

	const user = await db.collection<User>('users').findOne({ id });

	if (!user) return null;

	const { _id, ...plainUser } = user as User & { _id?: unknown };

	return plainUser;
}

export async function listUsers(): Promise<User[]> {
	const db = await getDb();

	const users = await db.collection<User>('users').find({}).toArray();

	return users.map((user) => {
		const { _id, ...plainUser } = user as User & { _id?: unknown };
		return plainUser;
	});
}



/* -------------------------------------------------------------------------- */
/* Activities                                                                 */
/* -------------------------------------------------------------------------- */

export async function listActivities(
	query: FeedQuery = {},
	viewerId?: string
): Promise<ActivityView[]> {
	const db = await getDb();

	const filter: Record<string, unknown> = {};

	if (query.campus) {
		filter.campus = query.campus;
	}

	if (query.category) {
		filter.category = query.category;
	}

	if (query.free) {
		filter.costCents = 0;
	}

	if (query.q?.trim()) {
		const q = query.q.trim();

		filter.$or = [
			{ title: { $regex: q, $options: 'i' } },
			{ body: { $regex: q, $options: 'i' } },
			{ location: { $regex: q, $options: 'i' } }
		];
	}

	let rows = await db
		.collection<Activity>('activities')
		.find(filter)
		.toArray();

	const perHead = (a: Activity) =>
		perPersonCents(a.costCents, a.costBasis, a.spots);

	const sort = query.sort ?? 'soonest';

	rows.sort((a, b) => {
		if (sort === 'new') {
			return b.createdAt.localeCompare(a.createdAt);
		}

		if (sort === 'cheapest') {
			return (
				perHead(a) - perHead(b) ||
				a.startsAt.localeCompare(b.startsAt)
			);
		}

		return a.startsAt.localeCompare(b.startsAt);
	});

	return await Promise.all(
		rows.map((activity) => toView(activity, viewerId))
	);
}

export async function getActivity(
	id: string,
	viewerId?: string
): Promise<ActivityView | null> {
	const db = await getDb();

	const activity = await db
		.collection<Activity>('activities')
		.findOne({ id });

	if (!activity) {
		return null;
	}

	return await toView(activity, viewerId);
}

export async function activitiesHostedBy(
	userId: string,
	viewerId?: string
): Promise<ActivityView[]> {
	const db = await getDb();

	const activities = await db
		.collection<Activity>('activities')
		.find({ hostId: userId })
		.sort({ startsAt: 1 })
		.toArray();

	return await Promise.all(
		activities.map((activity) => toView(activity, viewerId))
	);
}

export async function activitiesJoinedBy(
	userId: string,
	viewerId?: string
): Promise<ActivityView[]> {
	const db = await getDb();

	const activities = await db
		.collection<Activity>('activities')
		.find({
			hostId: { $ne: userId },
			memberIds: userId
		})
		.sort({ startsAt: 1 })
		.toArray();

	return await Promise.all(
		activities.map((activity) => toView(activity, viewerId))
	);
}

/* -------------------------------------------------------------------------- */
/* Create Activity                                                            */
/* -------------------------------------------------------------------------- */

export async function createActivity(
	input: NewActivityInput,
	hostId: string
): Promise<ActivityView> {
	const db = await getDb();

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

		memberIds: [hostId],

		costCents: input.costCents,
		costBasis: input.costBasis,

		createdAt: new Date().toISOString()
	};

	await db.collection<Activity>('activities').insertOne(activity);

	return await toView(activity, hostId);
}

/* -------------------------------------------------------------------------- */
/* Join / Leave                                                               */
/* -------------------------------------------------------------------------- */

export type JoinResult =
	| { ok: true; activity: ActivityView }
	| {
			ok: false;
			reason: 'not-found' | 'full' | 'already-joined';
	  };

export async function joinActivity(
	id: string,
	userId: string
): Promise<JoinResult> {
	const db = await getDb();

	const activity = await db
		.collection<Activity>('activities')
		.findOne({ id });

	if (!activity) {
		return {
			ok: false,
			reason: 'not-found'
		};
	}

	if (activity.memberIds.includes(userId)) {
		return {
			ok: false,
			reason: 'already-joined'
		};
	}

	if (activity.memberIds.length >= activity.spots) {
		return {
			ok: false,
			reason: 'full'
		};
	}

	const result = await db
		.collection<Activity>('activities')
		.findOneAndUpdate(
			{
				id,
				memberIds: { $ne: userId },
				$expr: {
					$lt: [
						{ $size: '$memberIds' },
						'$spots'
					]
				}
			},
			{
				$push: {
					memberIds: userId
				}
			},
			{
				returnDocument: 'after'
			}
		);

	if (!result) {
		return {
			ok: false,
			reason: 'full'
		};
	}

	return {
		ok: true,
		activity: await toView(result, userId)
	};
}

export type LeaveResult =
	| { ok: true; activity: ActivityView }
	| {
			ok: false;
			reason:
				| 'not-found'
				| 'not-a-member'
				| 'host-cannot-leave';
	  };

export async function leaveActivity(
	id: string,
	userId: string
): Promise<LeaveResult> {
	const db = await getDb();

	const activity = await db
		.collection<Activity>('activities')
		.findOne({ id });

	if (!activity) {
		return {
			ok: false,
			reason: 'not-found'
		};
	}

	if (activity.hostId === userId) {
		return {
			ok: false,
			reason: 'host-cannot-leave'
		};
	}

	if (!activity.memberIds.includes(userId)) {
		return {
			ok: false,
			reason: 'not-a-member'
		};
	}

	const result = await db
		.collection<Activity>('activities')
		.findOneAndUpdate(
			{ id },
			{
				$pull: {
					memberIds: userId
				}
			},
			{
				returnDocument: 'after'
			}
		);

	if (!result) {
		return {
			ok: false,
			reason: 'not-found'
		};
	}

	return {
		ok: true,
		activity: await toView(result, userId)
	};
}

/* -------------------------------------------------------------------------- */
/* Comments                                                                   */
/* -------------------------------------------------------------------------- */

export async function listComments(
	activityId: string
): Promise<CommentView[]> {
	const db = await getDb();

	const comments = await db
		.collection<Comment>('comments')
		.find({ activityId })
		.sort({ createdAt: 1 })
		.toArray();

	return await Promise.all(
		comments.map((comment) => toCommentView(comment))
	);
}

export async function addComment(
	activityId: string,
	authorId: string,
	body: string
): Promise<CommentView | null> {
	const db = await getDb();

	const exists = await db
		.collection<Activity>('activities')
		.findOne({ id: activityId });

	if (!exists) {
		return null;
	}

	const comment: Comment = {
		id: `c_${crypto.randomUUID().slice(0, 8)}`,
		activityId,
		authorId,
		body,
		createdAt: new Date().toISOString()
	};

	await db
		.collection<Comment>('comments')
		.insertOne(comment);

	return await toCommentView(comment);
}