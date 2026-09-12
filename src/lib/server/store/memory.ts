/**
 * In-memory backend. Zero setup for local dev; data lives only as long as
 * the process. Do NOT deploy with this — serverless platforms (Vercel) run
 * many short-lived instances that share nothing, so sign-ups vanish and
 * sessions randomly stop resolving.
 */

import { verifyPassword } from '../auth';
import { learnedInterests } from '$lib/matching';
import { SEED_VERSION, seedData } from '../seed';
import {
	MAX_SCORE,
	MIN_SCORE,
	type Activity,
	type Comment,
	type Rating,
	type User,
	type UserDoc
} from '$lib/types';
import {
	activityUpdates,
	campusScope,
	canOpenActivity,
	canSeeComment,
	hostStandingFrom,
	isListed,
	needsApproval,
	rankFrom,
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

interface MemoryState {
	version: number;
	ratings: Rating[];
	users: Map<string, UserDoc>;
	activities: Map<string, Activity>;
	comments: Comment[];
}

declare global {
	var __tagalongStore: MemoryState | undefined;
}

function boot(): MemoryState {
	const { users, activities, comments } = seedData();
	return {
		version: SEED_VERSION,
		ratings: [],
		users: new Map(users.map((u) => [u.id, u])),
		activities: new Map(activities.map((a) => [a.id, a])),
		comments
	};
}

export function createMemoryStore(): Store {
	/* Persist across Vite HMR so editing a route does not wipe the demo data —
	   unless the seed itself changed, in which case start fresh. */
	if (globalThis.__tagalongStore?.version !== SEED_VERSION) globalThis.__tagalongStore = boot();
	const state = globalThis.__tagalongStore;

	const usersFor = (ids: string[]): Map<string, User> => {
		const map = new Map<string, User>();
		for (const id of ids) {
			const doc = state.users.get(id);
			if (doc) map.set(id, toUser(doc));
		}
		return map;
	};
	const commentCount = (activityId: string) =>
		state.comments.filter((c) => c.activityId === activityId).length;
	const scoresFor = (activityId: string) =>
		state.ratings.filter((r) => r.activityId === activityId).map((r) => r.score);
	const hasRated = (activityId: string, viewerId?: string) =>
		Boolean(
			viewerId && state.ratings.some((r) => r.activityId === activityId && r.raterId === viewerId)
		);

	const views = (rows: Activity[], viewer?: Viewer) => {
		const users = usersFor(referencedUserIds(rows));
		return rows.map((a) =>
			toView(
				a,
				users,
				commentCount(a.id),
				viewer,
				ratingSummary(scoresFor(a.id), a, viewer?.id, hasRated(a.id, viewer?.id))
			)
		);
	};
	const view = (a: Activity, viewer?: Viewer) => views([a], viewer)[0];
	const byStart = (a: Activity, b: Activity) => a.startsAt.localeCompare(b.startsAt);
	const findByEmail = (email: string) =>
		[...state.users.values()].find((u) => u.email === email.toLowerCase()) ?? null;

	return {
		async getUser(id) {
			const doc = state.users.get(id);
			return doc ? toUser(doc) : null;
		},

		async getUserByHandle(handle) {
			const doc = [...state.users.values()].find(
				(u) => u.handle.toLowerCase() === handle.toLowerCase()
			);
			return doc ? toUser(doc) : null;
		},

		async getSessionUser(id) {
			const doc = state.users.get(id);
			if (!doc) return null;
			return {
				user: toUser(doc),
				interests: [...new Set([...doc.interests, ...(doc.learnedInterests ?? [])])]
			};
		},

		async refreshLearnedInterests(userId) {
			const doc = state.users.get(userId);
			if (!doc) return;
			const categories = [...state.activities.values()]
				.filter((a) => a.memberIds.includes(userId))
				.map((a) => a.category);
			doc.learnedInterests = learnedInterests(categories, doc.interests);
		},

		async getUserEmail(id) {
			return state.users.get(id)?.email ?? null;
		},

		async verifyLogin(email, password) {
			const doc = findByEmail(email);
			if (!doc || !verifyPassword(password, doc.passwordHash)) return null;
			return toUser(doc);
		},

		async createUser(input) {
			if (findByEmail(input.email)) return { ok: false, reason: 'email-taken' };
			const base = handleBase(input.email);
			let handle = base;
			for (let n = 2; [...state.users.values()].some((u) => u.handle === handle); n++) {
				handle = `${base}${n}`;
			}
			const doc = newUserDoc(input, handle, state.users.size % 8);
			state.users.set(doc.id, doc);
			return { ok: true, user: toUser(doc) };
		},

		async updateProfile(userId, patch) {
			const doc = state.users.get(userId);
			if (!doc) return null;
			if (patch.bio !== undefined) doc.bio = patch.bio;
			if (patch.isPrivate !== undefined) doc.isPrivate = patch.isPrivate;
			if (patch.interests !== undefined) doc.interests = patch.interests;
			return toUser(doc);
		},

		async listActivities(query = {}, viewer) {
			let rows = [...state.activities.values()].filter((a) => isListed(a, viewer));
			const scope = campusScope(query, viewer);
			if (scope) rows = rows.filter((a) => scope.includes(a.campus));
			if (query.category) rows = rows.filter((a) => a.category === query.category);
			if (query.free) rows = rows.filter((a) => a.costCents === 0);
			return views(searchAndSort(rows, query, viewer), viewer);
		},

		async getActivity(id, viewer) {
			const a = state.activities.get(id);
			// Student-only activities are sealed, not just unlisted: no view for
			// someone who shouldn't have it, even holding the link.
			if (!a || !canOpenActivity(a, viewer)) return null;
			return view(a, viewer);
		},

		async listComments(activityId, viewerId) {
			const rows = state.comments
				.filter((c) => c.activityId === activityId)
				.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
			const users = usersFor(rows.map((c) => c.authorId));

			const activity = state.activities.get(activityId);
			const isMember = Boolean(viewerId && activity?.memberIds.includes(viewerId));

			const allowed = rows.filter((c) =>
				canSeeComment(c, users.get(c.authorId), viewerId, isMember)
			);
			return {
				visible: allowed.map((c) => toCommentView(c, users)),
				hidden: rows.length - allowed.length
			};
		},

		async activitiesHostedBy(userId, viewer) {
			const rows = [...state.activities.values()].filter((a) => a.hostId === userId).sort(byStart);
			return views(rows, viewer);
		},

		async activitiesJoinedBy(userId, viewer) {
			const rows = [...state.activities.values()]
				.filter((a) => a.hostId !== userId && a.memberIds.includes(userId))
				.sort(byStart);
			return views(rows, viewer);
		},

		async grassLeaderboard(limit = 10) {
			const counts = new Map<string, number>();
			for (const a of state.activities.values()) {
				if (!a.completedAt) continue; // only what actually happened counts
				for (const m of a.memberIds) counts.set(m, (counts.get(m) ?? 0) + 1);
			}
			return [...counts.entries()]
				.map(([userId, score]) => ({ userId, score }))
				.sort((a, b) => b.score - a.score || a.userId.localeCompare(b.userId))
				.slice(0, limit);
		},

		async grassRank(userId) {
			const counts = new Map<string, number>();
			for (const doc of state.users.values()) counts.set(doc.id, 0);
			for (const a of state.activities.values()) {
				if (!a.completedAt) continue;
				for (const m of a.memberIds) counts.set(m, (counts.get(m) ?? 0) + 1);
			}
			return rankFrom(
				[...counts.entries()].map(([id, score]) => ({ userId: id, score })),
				userId
			);
		},

		async markBadgesSeen(userId, badgeIds) {
			const doc = state.users.get(userId);
			if (!doc) return [];
			const seen = new Set(doc.seenBadges ?? []);
			const fresh = badgeIds.filter((id) => !seen.has(id));
			if (fresh.length > 0) doc.seenBadges = [...seen, ...fresh];
			return fresh;
		},

		async createActivity(input, hostId) {
			const a = newActivityDoc(input, hostId);
			state.activities.set(a.id, a);
			return view(a, { id: hostId });
		},

		async updateActivity(id, hostId, patch) {
			const a = state.activities.get(id);
			if (!a) return { ok: false, reason: 'not-found' };
			if (a.hostId !== hostId) return { ok: false, reason: 'not-host' };
			if (patch.spots !== undefined && patch.spots < a.memberIds.length) {
				return { ok: false, reason: 'too-few-spots' };
			}

			Object.assign(a, activityUpdates(patch));
			return { ok: true, activity: view(a, { id: hostId }) };
		},

		async completeActivity(id, hostId, complete = true) {
			const a = state.activities.get(id);
			if (!a) return { ok: false, reason: 'not-found' };
			if (a.hostId !== hostId) return { ok: false, reason: 'not-host' };
			if (complete && new Date(a.startsAt).getTime() > Date.now()) {
				return { ok: false, reason: 'not-started' };
			}

			if (complete) a.completedAt = new Date().toISOString();
			else delete a.completedAt;
			return { ok: true, activity: view(a, { id: hostId }) };
		},

		async joinActivity(id, userId) {
			const a = state.activities.get(id);
			if (!a) return { ok: false, reason: 'not-found' };
			if (a.memberIds.includes(userId)) return { ok: false, reason: 'already-joined' };
			// The host vets everyone here — this has to go through the waitlist.
			if (a.approvalRequired) return { ok: false, reason: 'needs-approval' };
			if (a.memberIds.length >= a.spots) return { ok: false, reason: 'full' };
			a.memberIds.push(userId);
			return { ok: true, activity: view(a, { id: userId }) };
		},

		async leaveActivity(id, userId) {
			const a = state.activities.get(id);
			if (!a) return { ok: false, reason: 'not-found' };
			if (a.hostId === userId) return { ok: false, reason: 'host-cannot-leave' };
			if (!a.memberIds.includes(userId)) return { ok: false, reason: 'not-a-member' };
			a.memberIds = a.memberIds.filter((m) => m !== userId);
			return { ok: true, activity: view(a, { id: userId }) };
		},

		async joinWaitlist(id, userId) {
			const a = state.activities.get(id);
			if (!a) return { ok: false, reason: 'not-found' };
			if (a.memberIds.includes(userId)) return { ok: false, reason: 'already-joined' };
			if (!needsApproval(a)) return { ok: false, reason: 'open' };
			a.waitlistIds ??= [];
			if (a.waitlistIds.includes(userId)) return { ok: false, reason: 'already-waiting' };
			a.waitlistIds.push(userId);
			return { ok: true, activity: view(a, { id: userId }) };
		},

		async leaveWaitlist(id, userId) {
			const a = state.activities.get(id);
			if (!a) return { ok: false, reason: 'not-found' };
			if (!(a.waitlistIds ?? []).includes(userId)) return { ok: false, reason: 'not-waiting' };
			a.waitlistIds = (a.waitlistIds ?? []).filter((w) => w !== userId);
			return { ok: true, activity: view(a, { id: userId }) };
		},

		async approveWaitlist(id, hostId, userId) {
			const a = state.activities.get(id);
			if (!a) return { ok: false, reason: 'not-found' };
			if (a.hostId !== hostId) return { ok: false, reason: 'not-host' };
			if (!(a.waitlistIds ?? []).includes(userId)) return { ok: false, reason: 'not-waiting' };

			// Take a free spot if there is one; otherwise the host is making room.
			const addedSpot = a.memberIds.length >= a.spots;
			if (addedSpot) a.spots += 1;

			a.waitlistIds = (a.waitlistIds ?? []).filter((w) => w !== userId);
			a.memberIds.push(userId);
			return { ok: true, activity: view(a, { id: hostId }), addedSpot };
		},

		async declineWaitlist(id, hostId, userId) {
			const a = state.activities.get(id);
			if (!a) return { ok: false, reason: 'not-found' };
			if (a.hostId !== hostId) return { ok: false, reason: 'not-host' };
			if (!(a.waitlistIds ?? []).includes(userId)) return { ok: false, reason: 'not-waiting' };
			a.waitlistIds = (a.waitlistIds ?? []).filter((w) => w !== userId);
			return { ok: true, activity: view(a, { id: hostId }), addedSpot: false };
		},

		async rateActivity(activityId, raterId, score) {
			if (!Number.isInteger(score) || score < MIN_SCORE || score > MAX_SCORE) {
				return { ok: false, reason: 'bad-score' };
			}
			const activity = state.activities.get(activityId);
			if (!activity) return { ok: false, reason: 'not-found' };
			if (!activity.memberIds.includes(raterId)) return { ok: false, reason: 'not-attended' };
			if (new Date(activity.startsAt).getTime() > Date.now())
				return { ok: false, reason: 'not-yet' };
			if (hasRated(activityId, raterId)) return { ok: false, reason: 'already-rated' };

			state.ratings.push({
				id: `r_${crypto.randomUUID().slice(0, 8)}`,
				activityId,
				hostId: activity.hostId,
				raterId,
				score,
				createdAt: new Date().toISOString()
			});
			return { ok: true };
		},

		async hostStanding(hostId) {
			const hosted = [...state.activities.values()].filter((a) => a.hostId === hostId);
			const averages = hosted
				.map((a) => scoresFor(a.id))
				.filter((scores) => scores.length > 0)
				.map((scores) => scores.reduce((x, y) => x + y, 0) / scores.length);
			return hostStandingFrom(hosted.length, averages);
		},

		async addComment(activityId, authorId, body, visibility) {
			if (!state.activities.has(activityId)) return null;
			const c = newCommentDoc(activityId, authorId, body, visibility);
			state.comments.push(c);
			return toCommentView(c, usersFor([authorId]));
		}
	};
}
