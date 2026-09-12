/**
 * Feed ranking — how well an activity matches the person looking at it.
 *
 * Pure functions over the app's own types, so they run on the server (feed
 * sorting) and in the browser (showing a match badge) without a database.
 *
 * Three signals, blended:
 *   interests  what they said they're into, vs the activity's tags
 *   proximity  how far it is — a great match 100 miles away is not a match
 *   urgency    sooner is more actionable; things weeks out can wait
 *
 * Someone who skipped the survey still gets a sensible feed: the interest
 * term drops out and the other two take its place.
 */

import { distanceToCampus } from './geo';
import type { CampusId, LatLng } from './types';

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
	campus: CampusId;
	startsAt: string;
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

	const interest = jaccardSimilarity(tags, target.interests);
	return 0.55 * interest + 0.25 * proximity + 0.2 * urgency;
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
	const shared = jaccardSimilarity(viewer.interests, target.interests);
	if (shared === 0) return null;
	return Math.round(relevance(viewer, target) * 100);
}
