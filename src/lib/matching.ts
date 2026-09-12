/**
 * Feed ranking — how well an activity matches the person looking at it.
 *
 * Pure functions over the app's own types, so they run on the server (feed
 * sorting) and in the browser (showing a match badge) without a database.
 *
 * Four signals, blended:
 *   interests  what they said they're into, vs the activity's tags
 *   category   whether the whole category is their kind of thing
 *   proximity  how far it is — a great match 100 miles away is not a match
 *   urgency    sooner is more actionable; things weeks out can wait
 *
 * Category counts twice over, on purpose. An activity is matched on its own
 * tags PLUS its category's, so a post nobody tagged carefully still lands with
 * the right people; and the category itself scores, so someone who picked
 * "driving" sees rides they'd otherwise miss.
 *
 * Someone who skipped the survey still gets a sensible feed: the interest
 * term drops out and the other two take its place.
 */

import { distanceToCampus } from './geo';
import {
	CATEGORIES,
	CATEGORY_INTERESTS,
	type CampusId,
	type CategoryId,
	type LatLng
} from './types';

/**
 * Cosine similarity of two equal-length embedding vectors, -1..1 (in
 * practice 0..1 for these embeddings). 0 if either is missing or they don't
 * match in length.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;

	let dot = 0;
	let magA = 0;
	let magB = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		magA += a[i] * a[i];
		magB += b[i] * b[i];
	}

	return magA === 0 || magB === 0 ? 0 : dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/** Overlap of two tag sets, 0–1. Order and case don't matter. */
export function jaccardSimilarity(a: string[], b: string[]): number {
	if (!a.length || !b.length) return 0;
	const setA = new Set(a.map((s) => s.trim().toLowerCase()));
	const setB = new Set(b.map((s) => s.trim().toLowerCase()));
	let shared = 0;
	for (const tag of setA) if (setB.has(tag)) shared++;
	const union = setA.size + setB.size - shared;
	return union === 0 ? 0 : shared / union;
}

/** The person the feed is being built for. */
export interface MatchViewer {
	interests?: string[];
	location?: LatLng;
}

/** The parts of an activity that ranking cares about. */
export interface MatchTarget {
	interests: string[];
	category: CategoryId;
	campus: CampusId;
	startsAt: string;
}

/**
 * An activity's own tags plus the ones implied by its category, deduplicated.
 * Hosts tag inconsistently — "airport runs" instead of "rides" — so the
 * category fills the gaps.
 */
export function effectiveTags(target: MatchTarget): string[] {
	return [...new Set([...target.interests, ...(CATEGORY_INTERESTS[target.category] ?? [])])];
}

/**
 * Categories implied by someone's interests: a category counts if the viewer
 * picked any tag it stands for. "cooking" implies Groceries, "music" implies
 * both Subscriptions and Hangouts.
 */
export function preferredCategories(interests: string[]): CategoryId[] {
	const picked = new Set(interests.map((i) => i.trim().toLowerCase()));
	return CATEGORIES.filter((c) =>
		(CATEGORY_INTERESTS[c.id] ?? []).some((tag) => picked.has(tag))
	).map((c) => c.id);
}

/** 1 next door, tapering to 0 at ~60 miles. */
function proximityScore(viewer: MatchViewer, campus: CampusId): number {
	if (!viewer.location) return 0.5; // unknown location shouldn't punish anything
	const miles = distanceToCampus(viewer.location, campus);
	return Math.max(0, 1 - miles / 60);
}

/** 1 for the next day or so, tapering to 0 about two weeks out. Past = 0. */
function urgencyScore(startsAt: string, now: number): number {
	const hours = (new Date(startsAt).getTime() - now) / 3_600_000;
	if (hours < 0) return 0;
	if (hours <= 24) return 1;
	return Math.max(0, 1 - (hours - 24) / (14 * 24));
}

/**
 * How relevant this activity is to this viewer, 0–1.
 * Use `rankByRelevance` to sort; this is exported for badges and debugging.
 */
export function relevance(viewer: MatchViewer, target: MatchTarget, now = Date.now()): number {
	const proximity = proximityScore(viewer, target.campus);
	const urgency = urgencyScore(target.startsAt, now);

	const tags = viewer.interests ?? [];
	if (tags.length === 0) return 0.6 * proximity + 0.4 * urgency;

	const interest = jaccardSimilarity(tags, effectiveTags(target));
	const category = preferredCategories(tags).includes(target.category) ? 1 : 0;

	return 0.45 * interest + 0.2 * category + 0.2 * proximity + 0.15 * urgency;
}

/** Sorted copy, best match first, ties broken by whichever starts sooner. */
export function rankByRelevance<T extends MatchTarget>(viewer: MatchViewer, items: T[]): T[] {
	const now = Date.now();
	const scored = items.map((item) => ({ item, score: relevance(viewer, item, now) }));
	scored.sort((a, b) => b.score - a.score || a.item.startsAt.localeCompare(b.item.startsAt));
	return scored.map((s) => s.item);
}

/** "82% match" — only worth showing when the viewer actually took the survey. */
export function matchPercent(viewer: MatchViewer, target: MatchTarget): number | null {
	if (!viewer.interests?.length) return null;
	const onTags = jaccardSimilarity(viewer.interests, effectiveTags(target)) > 0;
	const onCategory = preferredCategories(viewer.interests).includes(target.category);
	if (!onTags && !onCategory) return null;
	return Math.round(relevance(viewer, target) * 100);
}

/* -------------------------------------------------------------------------- */
/* Discovery                                                                   */
/* -------------------------------------------------------------------------- */

/** Deterministic shuffle — same seed, same order, so a page doesn't reshuffle. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
	let h = 2166136261;
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	const next = () => {
		h += 0x6d2b79f5;
		let t = h;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};

	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(next() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

export const WILDCARD_EVERY = 3;

/**
 * Slip something unexpected into a ranked feed: after every few good matches,
 * one drawn at random from further down. A feed that only ever agrees with you
 * stops showing you anything new — and the whole point is getting people out to
 * things they wouldn't have gone looking for.
 *
 * Returns the interleaved list plus the ids that were injected, so the caller
 * can mark them for the UI.
 */
export function interleaveWildcards<T extends { id: string }>(
	ranked: T[],
	seed: string,
	every = WILDCARD_EVERY
): { items: T[]; wildcardIds: Set<string> } {
	// Only the tail is wildcard material — the top is what they actually want.
	const keepTop = Math.max(every, Math.ceil(ranked.length / 3));
	const head = ranked.slice(0, keepTop);
	const tail = seededShuffle(ranked.slice(keepTop), seed);

	if (tail.length === 0) return { items: ranked, wildcardIds: new Set() };

	const items: T[] = [];
	const wildcardIds = new Set<string>();
	let t = 0;

	for (let i = 0; i < head.length; i++) {
		items.push(head[i]);
		if ((i + 1) % every === 0 && t < tail.length) {
			items.push(tail[t]);
			wildcardIds.add(tail[t].id);
			t++;
		}
	}

	// Whatever is left keeps its ranked order underneath.
	items.push(...tail.slice(t));
	return { items, wildcardIds };
}

/** How many joins in one category before it counts as a real interest. */
export const LEARN_THRESHOLD = 3;

/**
 * Interests inferred from what someone actually joins. Three grocery runs and
 * "groceries" is plainly a thing they do, whether or not they ticked it.
 */
export function learnedInterests(
	categories: CategoryId[],
	alreadyPicked: string[] = [],
	threshold = LEARN_THRESHOLD
): string[] {
	const counts = new Map<CategoryId, number>();
	for (const c of categories) counts.set(c, (counts.get(c) ?? 0) + 1);

	const picked = new Set(alreadyPicked.map((i) => i.toLowerCase()));
	const learned = new Set<string>();

	for (const [category, n] of counts) {
		if (n < threshold) continue;
		for (const tag of CATEGORY_INTERESTS[category] ?? []) {
			if (!picked.has(tag)) learned.add(tag);
		}
	}

	return [...learned];
}
