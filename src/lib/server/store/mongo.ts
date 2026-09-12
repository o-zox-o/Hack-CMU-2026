/**
 * MongoDB backend — what runs in production.
 *
 * Documents use our string ids as `_id` ("u_mei", "a_costco"), so nothing has
 * to convert ObjectIds and the same id works in URLs, cookies and queries.
 *
 * Connection: one MongoClient cached on globalThis so Vercel's warm function
 * instances (and Vite HMR) reuse it instead of reconnecting per request.
 * First connect creates indexes and seeds demo data if the db is empty.
 */

import { MongoClient, type Collection, type Db, type Filter } from 'mongodb';
import { verifyPassword } from '../auth';
import { learnedInterests } from '$lib/matching';
import { seedData } from '../seed';
import {
	isStudent,
	MAX_SCORE,
	MIN_SCORE,
	type Activity,
	type Visibility,
	type Comment,
	type Rating,
	type User,
	type UserDoc
} from '$lib/types';
import {
	activityUpdates,
	campusScope,
	canSeeComment,
	hostStandingFrom,
	ratingSummary,
	handleBase,
	newActivityDoc,
	newCommentDoc,
	newUserDoc,
	referencedUserIds,
	searchAndSort,
	toCommentView,
	toUser,
	toView
} from './shared';
import type { Store, Viewer } from './types';

/* Stored rows: same as the domain types with `id` renamed to `_id`. */
type Row<T extends { id: string }> = Omit<T, 'id'> & { _id: string };
type UserRow = Row<UserDoc>;
type ActivityRow = Row<Activity>;
type CommentRow = Row<Comment>;
type RatingRow = Row<Rating>;

const toRow = <T extends { id: string }>({ id, ...rest }: T): Row<T> => ({ _id: id, ...rest });
const fromRow = <T extends { id: string }>({ _id, ...rest }: Row<T>): T =>
	({ id: _id, ...rest }) as unknown as T;

declare global {
	var __tagalongMongo: Promise<Db> | undefined;
}

async function connect(uri: string, dbName: string): Promise<Db> {
	const client = new MongoClient(uri);
	await client.connect();
	const db = client.db(dbName);

	await Promise.all([
		db.collection<UserRow>('users').createIndex({ email: 1 }, { unique: true }),
		db.collection<UserRow>('users').createIndex({ handle: 1 }, { unique: true }),
		db.collection<ActivityRow>('activities').createIndex({ campus: 1, startsAt: 1 }),
		db.collection<ActivityRow>('activities').createIndex({ memberIds: 1 }),
		db.collection<CommentRow>('comments').createIndex({ activityId: 1, createdAt: 1 }),
		db
			.collection<RatingRow>('ratings')
			.createIndex({ activityId: 1, raterId: 1 }, { unique: true }),
		db.collection<RatingRow>('ratings').createIndex({ hostId: 1 })
	]);

	// Seed per collection, not all-or-nothing: a database that already has real
	// sign-ups but no activities still needs the demo activities, and a re-run
	// must never clobber a real account. Seed users are upserted by _id.
	const { users: seedUsers, activities: seedActivities, comments: seedComments } = seedData();

	const existing = await db
		.collection<UserRow>('users')
		.find({ _id: { $in: seedUsers.map((u) => u.id) } }, { projection: { _id: 1 } })
		.toArray();
	const have = new Set(existing.map((u) => u._id));
	const missing = seedUsers.filter((u) => !have.has(u.id));
	if (missing.length) {
		await db.collection<UserRow>('users').insertMany(missing.map(toRow));
		console.log(`[db] seeded ${missing.length} demo users`);
	}

	// Demo activities: insert the missing ones, and refresh the content of any
	// that already exist so edits to seed.ts actually reach a live database.
	// `memberIds` is deliberately excluded — that's the one field on a seeded
	// activity that belongs to real people.
	const activityCol = db.collection<ActivityRow>('activities');
	const seenActivities = new Set(
		(
			await activityCol
				.find({ _id: { $in: seedActivities.map((a) => a.id) } }, { projection: { _id: 1 } })
				.toArray()
		).map((a) => a._id)
	);

	const newActivities = seedActivities.filter((a) => !seenActivities.has(a.id));
	if (newActivities.length) {
		await activityCol.insertMany(newActivities.map(toRow));
		console.log(`[db] seeded ${newActivities.length} activities`);
	}

	const refresh = seedActivities.filter((a) => seenActivities.has(a.id));
	if (refresh.length) {
		await activityCol.bulkWrite(
			refresh.map((a) => {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { _id, memberIds, ...content } = toRow(a);
				return { updateOne: { filter: { _id }, update: { $set: content } } };
			})
		);
		console.log(`[db] refreshed ${refresh.length} seeded activities`);
	}

	if ((await db.collection('comments').estimatedDocumentCount()) === 0) {
		await db.collection<CommentRow>('comments').insertMany(seedComments.map(toRow));
		console.log(`[db] seeded ${seedComments.length} comments`);
	}

	return db;
}

/**
 * The $or clauses that mean "this viewer may see it in the feed" — the query
 * form of isListed() in shared.ts. Legacy docs have no `visibility` field and
 * count as public.
 */
function visibleToClauses(viewer?: Viewer): Filter<ActivityRow>[] {
	const open: Visibility[] = ['public'];
	if (isStudent(viewer)) open.push('students');

	return [
		{ visibility: { $in: open } },
		{ visibility: { $exists: false } },
		...(isStudent(viewer) && viewer?.campus
			? [{ visibility: 'campus' as const, campus: viewer.campus }]
			: []),
		// Already involved: always visible, whatever it was changed to since.
		...(viewer?.id
			? [{ hostId: viewer.id }, { memberIds: viewer.id }, { waitlistIds: viewer.id }]
			: [])
	];
}

export function createMongoStore(uri: string, dbName: string): Store {
	const db = () => (globalThis.__tagalongMongo ??= connect(uri, dbName));
	const users = async (): Promise<Collection<UserRow>> => (await db()).collection('users');
	const activities = async (): Promise<Collection<ActivityRow>> =>
		(await db()).collection('activities');
	const comments = async (): Promise<Collection<CommentRow>> => (await db()).collection('comments');
	const ratings = async (): Promise<Collection<RatingRow>> => (await db()).collection('ratings');

	/* One query for every user a batch of activities refers to. */
	const usersFor = async (ids: string[]): Promise<Map<string, User>> => {
		if (ids.length === 0) return new Map();
		const rows = await (await users()).find({ _id: { $in: ids } }).toArray();
		return new Map(rows.map((r) => [r._id, toUser(fromRow<UserDoc>(r))]));
	};

	/* One aggregation for the comment counts of a batch of activities. */
	const commentCounts = async (ids: string[]): Promise<Map<string, number>> => {
		if (ids.length === 0) return new Map();
		const rows = await (
			await comments()
		)
			.aggregate<{ _id: string; n: number }>([
				{ $match: { activityId: { $in: ids } } },
				{ $group: { _id: '$activityId', n: { $sum: 1 } } }
			])
			.toArray();
		return new Map(rows.map((r) => [r._id, r.n]));
	};

	const views = async (rows: ActivityRow[], viewer?: Viewer) => {
		const docs = rows.map((r) => fromRow<Activity>(r));
		const ids = docs.map((a) => a.id);

		const [userMap, counts, ratingRows] = await Promise.all([
			usersFor(referencedUserIds(docs)),
			commentCounts(ids),
			(await ratings())
				.find({ activityId: { $in: ids } }, { projection: { activityId: 1, raterId: 1, score: 1 } })
				.toArray()
		]);

		const scores = new Map<string, number[]>();
		const mine = new Set<string>();
		for (const r of ratingRows) {
			(scores.get(r.activityId) ?? scores.set(r.activityId, []).get(r.activityId)!).push(r.score);
			if (viewer?.id && r.raterId === viewer.id) mine.add(r.activityId);
		}

		return docs.map((a) =>
			toView(
				a,
				userMap,
				counts.get(a.id) ?? 0,
				viewer,
				ratingSummary(scores.get(a.id) ?? [], a, viewer?.id, mine.has(a.id))
			)
		);
	};
	const view = async (row: ActivityRow, viewer?: Viewer) => (await views([row], viewer))[0];

	return {
		async getUser(id) {
			const row = await (await users()).findOne({ _id: id });
			return row ? toUser(fromRow<UserDoc>(row)) : null;
		},

		async getUserByHandle(handle) {
			// Handles are stored lowercase, and the index is unique on them.
			const row = await (await users()).findOne({ handle: handle.toLowerCase() });
			return row ? toUser(fromRow<UserDoc>(row)) : null;
		},

		async getSessionUser(id) {
			const row = await (await users()).findOne({ _id: id });
			if (!row) return null;
			const doc = fromRow<UserDoc>(row);
			return {
				user: toUser(doc),
				interests: [...new Set([...doc.interests, ...(doc.learnedInterests ?? [])])]
			};
		},

		async refreshLearnedInterests(userId) {
			const [row, joined] = await Promise.all([
				(await users()).findOne({ _id: userId }, { projection: { interests: 1 } }),
				(await activities()).find({ memberIds: userId }, { projection: { category: 1 } }).toArray()
			]);
			if (!row) return;

			await (
				await users()
			).updateOne(
				{ _id: userId },
				{
					$set: {
						learnedInterests: learnedInterests(
							joined.map((a) => a.category),
							row.interests
						)
					}
				}
			);
		},

		async getUserEmail(id) {
			const row = await (await users()).findOne({ _id: id }, { projection: { email: 1 } });
			return row?.email ?? null;
		},

		async verifyLogin(email, password) {
			const row = await (await users()).findOne({ email: email.toLowerCase() });
			if (!row || !verifyPassword(password, row.passwordHash)) return null;
			return toUser(fromRow<UserDoc>(row));
		},

		async createUser(input) {
			const col = await users();
			const base = handleBase(input.email);

			// Unique indexes on email and handle do the real guarding; we retry the
			// handle suffix on a handle collision and give up on an email collision.
			for (let n = 1; n <= 20; n++) {
				const handle = n === 1 ? base : `${base}${n}`;
				const doc = newUserDoc(input, handle, Math.floor(Math.random() * 8));
				try {
					await col.insertOne(toRow(doc));
					return { ok: true, user: toUser(doc) };
				} catch (err) {
					const e = err as { code?: number; message?: string };
					if (e.code !== 11000) throw err;
					if (e.message?.includes('email')) return { ok: false, reason: 'email-taken' };
					// else: handle taken -> loop and try the next suffix
				}
			}
			return { ok: false, reason: 'email-taken' };
		},

		async updateProfile(userId, patch) {
			// Only the keys actually supplied get written.
			const $set = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
			if (Object.keys($set).length === 0) return this.getUser(userId);

			const row = await (
				await users()
			).findOneAndUpdate({ _id: userId }, { $set }, { returnDocument: 'after' });
			return row ? toUser(fromRow<UserDoc>(row)) : null;
		},

		async listActivities(query = {}, viewer) {
			// The query form of isListed() in shared.ts. Keep the two in step.
			const filter: Filter<ActivityRow> = { $or: visibleToClauses(viewer) };
			const scope = campusScope(query, viewer);
			if (scope) filter.campus = { $in: scope as ActivityRow['campus'][] };
			if (query.category) filter.category = query.category;
			if (query.free) filter.costCents = 0;

			const rows = await (await activities()).find(filter).toArray();
			const sorted = searchAndSort(
				rows.map((r) => fromRow<Activity>(r)),
				query,
				viewer
			);
			return views(sorted.map(toRow), viewer);
		},

		async getActivity(id, viewer) {
			// Private is unlisted but openable, so it's allowed here even though
			// visibleToClauses() keeps it out of the feed. The student-only tiers
			// are sealed and stay excluded.
			const row = await (
				await activities()
			).findOne({
				_id: id,
				$or: [...visibleToClauses(viewer), { visibility: 'private' }]
			});
			return row ? view(row, viewer) : null;
		},

		async listComments(activityId, viewerId) {
			const [rows, activity] = await Promise.all([
				(await comments()).find({ activityId }).sort({ createdAt: 1 }).toArray(),
				(await activities()).findOne({ _id: activityId }, { projection: { memberIds: 1 } })
			]);

			const docs = rows.map((r) => fromRow<Comment>(r));
			const userMap = await usersFor([...new Set(docs.map((c) => c.authorId))]);
			const isMember = Boolean(viewerId && activity?.memberIds.includes(viewerId));

			const allowed = docs.filter((c) =>
				canSeeComment(c, userMap.get(c.authorId), viewerId, isMember)
			);
			return {
				visible: allowed.map((c) => toCommentView(c, userMap)),
				hidden: docs.length - allowed.length
			};
		},

		async activitiesHostedBy(userId, viewer) {
			const rows = await (
				await activities()
			)
				.find({ hostId: userId })
				.sort({ startsAt: 1 })
				.toArray();
			return views(rows, viewer);
		},

		async activitiesJoinedBy(userId, viewer) {
			const rows = await (
				await activities()
			)
				.find({ memberIds: userId, hostId: { $ne: userId } })
				.sort({ startsAt: 1 })
				.toArray();
			return views(rows, viewer);
		},

		async grassLeaderboard(limit = 10) {
			return (await activities())
				.aggregate<{ userId: string; score: number }>([
					// Only what actually happened counts.
					{ $match: { completedAt: { $exists: true, $ne: null } } },
					{ $unwind: '$memberIds' },
					{ $group: { _id: '$memberIds', score: { $sum: 1 } } },
					{ $sort: { score: -1, _id: 1 } },
					{ $limit: limit },
					{ $project: { _id: 0, userId: '$_id', score: 1 } }
				])
				.toArray();
		},

		async createActivity(input, hostId) {
			const doc = newActivityDoc(input, hostId);
			await (await activities()).insertOne(toRow(doc));
			return view(toRow(doc), { id: hostId });
		},

		/**
		 * The spots floor is in the filter, not a read-then-write: someone
		 * joining at the same moment must not end up outside the new capacity.
		 */
		async updateActivity(id, hostId, patch) {
			const $set = activityUpdates(patch);
			const col = await activities();

			const capacity =
				patch.spots === undefined
					? {}
					: { $expr: { $lte: [{ $size: '$memberIds' }, patch.spots] } };

			const updated = await col.findOneAndUpdate(
				{ _id: id, hostId, ...capacity },
				{ $set },
				{ returnDocument: 'after' }
			);
			if (updated) return { ok: true, activity: await view(updated, { id: hostId }) };

			const current = await col.findOne({ _id: id });
			if (!current) return { ok: false, reason: 'not-found' };
			if (current.hostId !== hostId) return { ok: false, reason: 'not-host' };
			return { ok: false, reason: 'too-few-spots' };
		},

		async completeActivity(id, hostId, complete = true) {
			const col = await activities();

			// "Has it started?" belongs in the filter so the clock can't move
			// between the read and the write.
			const started = complete ? { startsAt: { $lte: new Date().toISOString() } } : {};
			const update = complete
				? { $set: { completedAt: new Date().toISOString() } }
				: { $unset: { completedAt: '' as const } };

			const updated = await col.findOneAndUpdate({ _id: id, hostId, ...started }, update, {
				returnDocument: 'after'
			});
			if (updated) return { ok: true, activity: await view(updated, { id: hostId }) };

			const current = await col.findOne({ _id: id });
			if (!current) return { ok: false, reason: 'not-found' };
			if (current.hostId !== hostId) return { ok: false, reason: 'not-host' };
			return { ok: false, reason: 'not-started' };
		},

		/**
		 * ONE atomic update with the capacity check inside the filter. A plain
		 * read-then-write lets two simultaneous joins both take the last spot.
		 */
		async joinActivity(id, userId) {
			const col = await activities();
			const updated = await col.findOneAndUpdate(
				{
					_id: id,
					memberIds: { $ne: userId },
					approvalRequired: { $ne: true },
					$expr: { $lt: [{ $size: '$memberIds' }, '$spots'] }
				},
				{ $push: { memberIds: userId } },
				{ returnDocument: 'after' }
			);
			if (updated) return { ok: true, activity: await view(updated, { id: userId }) };

			// Didn't match — work out why for the error message.
			const current = await col.findOne({ _id: id });
			if (!current) return { ok: false, reason: 'not-found' };
			if (current.memberIds.includes(userId)) return { ok: false, reason: 'already-joined' };
			if (current.approvalRequired) return { ok: false, reason: 'needs-approval' };
			return { ok: false, reason: 'full' };
		},

		async leaveActivity(id, userId) {
			const col = await activities();
			const updated = await col.findOneAndUpdate(
				{ _id: id, hostId: { $ne: userId }, memberIds: userId },
				{ $pull: { memberIds: userId } },
				{ returnDocument: 'after' }
			);
			if (updated) return { ok: true, activity: await view(updated, { id: userId }) };

			const current = await col.findOne({ _id: id });
			if (!current) return { ok: false, reason: 'not-found' };
			if (current.hostId === userId) return { ok: false, reason: 'host-cannot-leave' };
			return { ok: false, reason: 'not-a-member' };
		},

		/**
		 * Only queues when the host actually has a say — they vet everyone, or
		 * it's full. Checked in the filter so a spot opening up mid-request
		 * doesn't leave someone waiting on a door that's already open.
		 */
		async joinWaitlist(id, userId) {
			const col = await activities();
			const updated = await col.findOneAndUpdate(
				{
					_id: id,
					memberIds: { $ne: userId },
					waitlistIds: { $ne: userId },
					$or: [
						{ approvalRequired: true },
						{ $expr: { $gte: [{ $size: '$memberIds' }, '$spots'] } }
					]
				},
				{ $push: { waitlistIds: userId } },
				{ returnDocument: 'after' }
			);
			if (updated) return { ok: true, activity: await view(updated, { id: userId }) };

			const current = await col.findOne({ _id: id });
			if (!current) return { ok: false, reason: 'not-found' };
			if (current.memberIds.includes(userId)) return { ok: false, reason: 'already-joined' };
			if ((current.waitlistIds ?? []).includes(userId))
				return { ok: false, reason: 'already-waiting' };
			return { ok: false, reason: 'open' };
		},

		async leaveWaitlist(id, userId) {
			const col = await activities();
			const updated = await col.findOneAndUpdate(
				{ _id: id, waitlistIds: userId },
				{ $pull: { waitlistIds: userId } },
				{ returnDocument: 'after' }
			);
			if (updated) return { ok: true, activity: await view(updated, { id: userId }) };
			return {
				ok: false,
				reason: (await col.countDocuments({ _id: id })) ? 'not-waiting' : 'not-found'
			};
		},

		/**
		 * Move someone from the queue into the activity. Two atomic attempts:
		 * take a free spot, or — if there are none — add one, which is the host
		 * deciding to make room.
		 */
		async approveWaitlist(id, hostId, userId) {
			const col = await activities();
			const base = { _id: id, hostId, waitlistIds: userId };

			const intoFreeSpot = await col.findOneAndUpdate(
				{ ...base, $expr: { $lt: [{ $size: '$memberIds' }, '$spots'] } },
				{ $pull: { waitlistIds: userId }, $push: { memberIds: userId } },
				{ returnDocument: 'after' }
			);
			if (intoFreeSpot) {
				return { ok: true, activity: await view(intoFreeSpot, { id: hostId }), addedSpot: false };
			}

			const withNewSpot = await col.findOneAndUpdate(
				base,
				{ $pull: { waitlistIds: userId }, $push: { memberIds: userId }, $inc: { spots: 1 } },
				{ returnDocument: 'after' }
			);
			if (withNewSpot) {
				return { ok: true, activity: await view(withNewSpot, { id: hostId }), addedSpot: true };
			}

			const current = await col.findOne({ _id: id });
			if (!current) return { ok: false, reason: 'not-found' };
			if (current.hostId !== hostId) return { ok: false, reason: 'not-host' };
			return { ok: false, reason: 'not-waiting' };
		},

		async declineWaitlist(id, hostId, userId) {
			const col = await activities();
			const updated = await col.findOneAndUpdate(
				{ _id: id, hostId, waitlistIds: userId },
				{ $pull: { waitlistIds: userId } },
				{ returnDocument: 'after' }
			);
			if (updated) {
				return { ok: true, activity: await view(updated, { id: hostId }), addedSpot: false };
			}

			const current = await col.findOne({ _id: id });
			if (!current) return { ok: false, reason: 'not-found' };
			if (current.hostId !== hostId) return { ok: false, reason: 'not-host' };
			return { ok: false, reason: 'not-waiting' };
		},

		async rateActivity(activityId, raterId, score) {
			if (!Number.isInteger(score) || score < MIN_SCORE || score > MAX_SCORE) {
				return { ok: false, reason: 'bad-score' };
			}

			const activity = await (await activities()).findOne({ _id: activityId });
			if (!activity) return { ok: false, reason: 'not-found' };
			if (!activity.memberIds.includes(raterId)) return { ok: false, reason: 'not-attended' };
			if (new Date(activity.startsAt).getTime() > Date.now())
				return { ok: false, reason: 'not-yet' };

			// One rating per person per activity — the unique index is what
			// actually enforces it, so two taps can't both land.
			const doc: Rating = {
				id: `r_${crypto.randomUUID().slice(0, 8)}`,
				activityId,
				hostId: activity.hostId,
				raterId,
				score,
				createdAt: new Date().toISOString()
			};
			try {
				await (await ratings()).insertOne(toRow(doc));
			} catch (err) {
				if ((err as { code?: number }).code === 11000) {
					return { ok: false, reason: 'already-rated' };
				}
				throw err;
			}
			return { ok: true };
		},

		async hostStanding(hostId) {
			const [hosted, perActivity] = await Promise.all([
				(await activities()).countDocuments({ hostId }),
				(await ratings())
					.aggregate<{ _id: string; average: number }>([
						{ $match: { hostId } },
						{ $group: { _id: '$activityId', average: { $avg: '$score' } } }
					])
					.toArray()
			]);
			return hostStandingFrom(
				hosted,
				perActivity.map((r) => r.average)
			);
		},

		async addComment(activityId, authorId, body, visibility) {
			const exists = await (await activities()).countDocuments({ _id: activityId }, { limit: 1 });
			if (!exists) return null;
			const doc = newCommentDoc(activityId, authorId, body, visibility);
			await (await comments()).insertOne(toRow(doc));
			return toCommentView(doc, await usersFor([authorId]));
		}
	};
}
