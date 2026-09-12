/**
 * MongoDB connection helper — not wired up yet.
 *
 * The app currently runs on the in-memory store in $lib/server/db.ts so you can
 * build UI without a database. When you are ready:
 *
 *   1. npm install mongodb
 *   2. Put MONGODB_URI and MONGODB_DB in .env (see .env.example)
 *   3. Uncomment the block below
 *   4. Rewrite the function bodies in db.ts to use `collection(...)`.
 *      Keep the same exports and the same return types (ActivityView) and no
 *      route or component needs to change.
 *
 * Two things to keep when you port db.ts:
 *   - `toView()` stays the single place a stored doc becomes wire JSON, so an
 *     ObjectId can never reach the browser. Convert with `_id.toString()`.
 *   - `joinActivity()` stays ONE atomic findOneAndUpdate with the capacity
 *     check inside the filter. Read-then-write reintroduces overbooking.
 */

// import { MongoClient, type Collection, type Db } from 'mongodb';
// import { env } from '$env/dynamic/private';
//
// let client: MongoClient | null = null;
// let db: Db | null = null;
//
// export async function getDb(): Promise<Db> {
// 	if (db) return db;
//
// 	const uri = env.MONGODB_URI;
// 	if (!uri) throw new Error('MONGODB_URI is not set — copy .env.example to .env');
//
// 	client = new MongoClient(uri);
// 	await client.connect();
// 	db = client.db(env.MONGODB_DB ?? 'tagalong');
//
// 	// Indexes the feed query needs. Safe to call on every cold start.
// 	await db.collection('activities').createIndex({ campus: 1, startsAt: 1 });
// 	await db.collection('activities').createIndex({ category: 1, startsAt: 1 });
// 	await db.collection('comments').createIndex({ activityId: 1, createdAt: 1 });
//
// 	return db;
// }
//
// export async function collection<T extends Document>(name: string): Promise<Collection<T>> {
// 	return (await getDb()).collection<T>(name);
// }

export {};
