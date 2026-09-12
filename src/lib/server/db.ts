/**
 * The data layer entry point. Picks a backend once:
 *
 *   MONGODB_URI set   -> MongoDB
 *   MONGODB_URI unset -> in-memory
 */

import { env } from '$env/dynamic/private';
import { createMemoryStore } from './store/memory';
import { createMongoStore } from './store/mongo';
import type { Store } from './store/types';

export { DEMO_PASSWORD } from './seed';
export type { JoinResult, LeaveResult, SignupResult, Viewer } from './store/types';

const uri = env.MONGODB_URI;

export const store: Store = uri
	? createMongoStore(uri, env.MONGODB_DB || 'tagalong')
	: createMemoryStore();

console.log(
	`[db] backend: ${
		uri ? `MongoDB (${env.MONGODB_DB || 'tagalong'})` : 'in-memory (set MONGODB_URI to persist)'
	}`
);

export const {
	getUser,
	getUserEmail,
	verifyLogin,
	createUser,
	setInterests,
	listActivities,
	getActivity,
	listComments,
	activitiesHostedBy,
	activitiesJoinedBy,
	createActivity,
	joinActivity,
	leaveActivity,
	addComment
} = store;
