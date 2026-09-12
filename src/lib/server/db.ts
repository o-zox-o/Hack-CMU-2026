import { MongoClient } from 'mongodb';
import { env } from '$env/dynamic/private';

let client: MongoClient | null = null;
let connecting: Promise<MongoClient> | null = null;

function getClient(): MongoClient {
	if (!client) {
		if (!env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
		client = new MongoClient(env.MONGODB_URI);
	}
	return client;
}

export async function getDb() {
	const c = getClient();
	if (!connecting) {
		// If the connection attempt fails, clear it so the next call retries
		// instead of every future request rejecting against a dead promise.
		connecting = c.connect().catch((err) => {
			connecting = null;
			throw err;
		});
	}
	await connecting;
	return c.db(env.MONGODB_DB || 'travelbuddy');
}

let usersIndexesEnsured: Promise<unknown> | null = null;

export async function getUsersCollection() {
	const db = await getDb();
	const users = db.collection('users');

	// Guards against two simultaneous signups racing find-then-insert into
	// duplicate user docs for the same Auth0 account.
	if (!usersIndexesEnsured) {
		usersIndexesEnsured = users.createIndex({ auth0Id: 1 }, { unique: true });
	}
	await usersIndexesEnsured;

	return users;
}
