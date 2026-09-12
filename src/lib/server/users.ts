import { ObjectId, MongoServerError, type WithId, type Document } from 'mongodb';
import { getUsersCollection } from './db.js';

export interface NewUserProfile {
	auth0Id: string;
	email: string;
	name?: string;
	picture?: string;
}

export interface ClientUser {
	id: string;
	email: string;
	name: string | null;
	picture: string | null;
	profileComplete: boolean;
}

/**
 * Creates the user on first login, or returns the existing one unchanged.
 * Verification status is intentionally re-derived from Auth0 on every login
 * rather than trusted from the stored doc, so a later Auth0-side change
 * (e.g. email re-verified) is picked up automatically.
 */
export async function findOrCreateUser(profile: NewUserProfile): Promise<WithId<Document>> {
	const users = await getUsersCollection();

	const existing = await users.findOne({ auth0Id: profile.auth0Id });
	if (existing) return existing;

	const now = new Date();
	const doc = {
		auth0Id: profile.auth0Id,
		email: profile.email,
		name: profile.name ?? null,
		picture: profile.picture ?? null,
		profileComplete: false,
		profile: {},
		createdAt: now,
		updatedAt: now
	};

	try {
		const { insertedId } = await users.insertOne(doc);
		return { _id: insertedId, ...doc };
	} catch (err) {
		// Lost the race to a concurrent signup for the same account — the
		// unique index on auth0Id rejected our insert. Fetch what won.
		if (err instanceof MongoServerError && err.code === 11000) {
			const winner = await users.findOne({ auth0Id: profile.auth0Id });
			if (winner) return winner;
		}
		throw err;
	}
}

export async function findUserById(id: string): Promise<WithId<Document> | null> {
	const users = await getUsersCollection();
	return users.findOne({ _id: new ObjectId(id) });
}

/**
 * Picks the fields safe to send to the client, in place of the raw Mongo
 * doc (which carries an ObjectId and could grow internal-only fields later).
 */
export function toClientUser(user: Document): ClientUser {
	return {
		id: user._id.toString(),
		email: user.email,
		name: user.name ?? null,
		picture: user.picture ?? null,
		profileComplete: Boolean(user.profileComplete)
	};
}
