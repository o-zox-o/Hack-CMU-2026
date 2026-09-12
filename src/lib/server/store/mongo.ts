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
import { seedData } from '../seed';
import type { Activity, Comment, User, UserDoc } from '$lib/types';
import {
	campusScope,
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
		db.collection<CommentRow>('comments').createIndex({ activityId: 1, createdAt: 1 })
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

	if ((await db.collection('activities').estimatedDocumentCount()) === 0) {
		await db.collection<ActivityRow>('activities').insertMany(seedActivities.map(toRow));
		console.log(`[db] seeded ${seedActivities.length} activities`);
	}

	if ((await db.collection('comments').estimatedDocumentCount()) === 0) {
		await db.collection<CommentRow>('comments').insertMany(seedComments.map(toRow));
		console.log(`[db] seeded ${seedComments.length} comments`);
	}

	return db;
}

export function createMongoStore(uri: string, dbName: string): Store {
	const db = () => (globalThis.__tagalongMongo ??= connect(uri, dbName));
	const users = async (): Promise<Collection<UserRow>> => (await db()).collection('users');
	const activities = async (): Promise<Collection<ActivityRow>> =>
		(await db()).collection('activities');
	const comments = async (): Promise<Collection<CommentRow>> => (await db()).collection('comments');

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
		const [userMap, counts] = await Promise.all([
			usersFor(referencedUserIds(docs)),
			commentCounts(docs.map((a) => a.id))
		]);
		return docs.map((a) => toView(a, userMap, counts.get(a.id) ?? 0, viewer));
	};
	const view = async (row: ActivityRow, viewer?: Viewer) => (await views([row], viewer))[0];

	return {
		async getUser(id) {
			const row = await (await users()).findOne({ _id: id });
			return row ? toUser(fromRow<UserDoc>(row)) : null;
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

		async listActivities(query = {}, viewer) {
			const filter: Filter<ActivityRow> = {};
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
			const row = await (await activities()).findOne({ _id: id });
			return row ? view(row, viewer) : null;
		},

		async listComments(activityId) {
			const rows = await (await comments()).find({ activityId }).sort({ createdAt: 1 }).toArray();
			const docs = rows.map((r) => fromRow<Comment>(r));
			const userMap = await usersFor([...new Set(docs.map((c) => c.authorId))]);
			return docs.map((c) => toCommentView(c, userMap));
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

		async createActivity(input, hostId) {
			const doc = newActivityDoc(input, hostId);
			await (await activities()).insertOne(toRow(doc));
			return view(toRow(doc), { id: hostId });
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

		async addComment(activityId, authorId, body) {
			const exists = await (await activities()).countDocuments({ _id: activityId }, { limit: 1 });
			if (!exists) return null;
			const doc = newCommentDoc(activityId, authorId, body);
			await (await comments()).insertOne(toRow(doc));
			return toCommentView(doc, await usersFor([authorId]));
		}
	};
}
