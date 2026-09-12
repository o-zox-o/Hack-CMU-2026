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
export type {
	ApprovalResult,
	CompleteResult,
	JoinResult,
	LeaveResult,
	ProfilePatch,
	SignupResult,
	UpdateResult,
	Viewer,
	WaitlistResult
} from './store/types';

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
	getUserByHandle,
	getSessionUser,
	refreshLearnedInterests,
	getUserEmail,
	verifyLogin,
	createUser,
	updateProfile,
	listActivities,
	getActivity,
	listComments,
	activitiesHostedBy,
	activitiesJoinedBy,
	grassLeaderboard,
	grassRank,
	markBadgesSeen,
	createActivity,
	updateActivity,
	completeActivity,
	joinActivity,
	leaveActivity,
	joinWaitlist,
	leaveWaitlist,
	approveWaitlist,
	declineWaitlist,
	addComment,
	rateActivity,
	hostStanding
} = store;
