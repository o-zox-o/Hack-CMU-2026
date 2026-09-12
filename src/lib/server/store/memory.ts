/**
 * In-memory backend. Zero setup for local dev; data lives only as long as
 * the process. Do NOT deploy with this — serverless platforms (Vercel) run
 * many short-lived instances that share nothing, so sign-ups vanish and
 * sessions randomly stop resolving.
 */

import { verifyPassword } from '../auth';
import { SEED_VERSION, seedData } from '../seed';
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

interface MemoryState {
	version: number;
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
	const views = (rows: Activity[], viewer?: Viewer) => {
		const users = usersFor(referencedUserIds(rows));
		return rows.map((a) => toView(a, users, commentCount(a.id), viewer));
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

		async listActivities(query = {}, viewer) {
			let rows = [...state.activities.values()];
			const scope = campusScope(query, viewer);
			if (scope) rows = rows.filter((a) => scope.includes(a.campus));
			if (query.category) rows = rows.filter((a) => a.category === query.category);
			if (query.free) rows = rows.filter((a) => a.costCents === 0);
			return views(searchAndSort(rows, query, viewer), viewer);
		},

		async getActivity(id, viewer) {
			const a = state.activities.get(id);
			return a ? view(a, viewer) : null;
		},

		async listComments(activityId) {
			const rows = state.comments
				.filter((c) => c.activityId === activityId)
				.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
			const users = usersFor(rows.map((c) => c.authorId));
			return rows.map((c) => toCommentView(c, users));
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

		async createActivity(input, hostId) {
			const a = newActivityDoc(input, hostId);
			state.activities.set(a.id, a);
			return view(a, { id: hostId });
		},

		async joinActivity(id, userId) {
			const a = state.activities.get(id);
			if (!a) return { ok: false, reason: 'not-found' };
			if (a.memberIds.includes(userId)) return { ok: false, reason: 'already-joined' };
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

		async addComment(activityId, authorId, body) {
			if (!state.activities.has(activityId)) return null;
			const c = newCommentDoc(activityId, authorId, body);
			state.comments.push(c);
			return toCommentView(c, usersFor([authorId]));
		}
	};
}
