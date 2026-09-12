/**
 * Touch grass — the profile's progression.
 *
 * Every activity you're part of is a blade of grass you've touched. The garden
 * on your profile grows with the count, and badges mark the milestones.
 *
 * Pure functions over ActivityView[], so the profile page, a future leaderboard
 * and any test can all use them without a database.
 */

import type { ActivityView, CategoryId } from './types';

/* -------------------------------------------------------------------------- */
/* Score                                                                       */
/* -------------------------------------------------------------------------- */

export interface GrassStats {
	/** Everything you host or have joined. */
	score: number;
	hosted: number;
	joined: number;
	/** Already happened — grass genuinely touched. */
	touched: number;
	/** Still to come — planted, not yet grown. */
	growing: number;
	byCategory: Partial<Record<CategoryId, number>>;
}

export function grassStats(
	hosting: ActivityView[],
	joined: ActivityView[],
	now = Date.now()
): GrassStats {
	const all = [...hosting, ...joined];
	const past = all.filter((a) => new Date(a.startsAt).getTime() < now);

	const byCategory: Partial<Record<CategoryId, number>> = {};
	for (const a of all) byCategory[a.category] = (byCategory[a.category] ?? 0) + 1;

	return {
		score: all.length,
		hosted: hosting.length,
		joined: joined.length,
		touched: past.length,
		growing: all.length - past.length,
		byCategory
	};
}

/* -------------------------------------------------------------------------- */
/* Garden stages                                                               */
/* -------------------------------------------------------------------------- */

export interface Stage {
	name: string;
	blurb: string;
	/** Score at which this stage starts. */
	from: number;
}

export const STAGES: Stage[] = [
	{ from: 0, name: 'Bare patch', blurb: 'Nothing planted yet. Join something.' },
	{ from: 1, name: 'Seedling', blurb: 'First blade. It counts.' },
	{ from: 3, name: 'Sprouting', blurb: 'Something is definitely growing.' },
	{ from: 6, name: 'Patchy lawn', blurb: 'You leave the building on purpose now.' },
	{ from: 10, name: 'In bloom', blurb: 'Buds everywhere. Look at you.' },
	{ from: 20, name: 'Wildflower meadow', blurb: 'Certified outside.' }
];

export function stageFor(score: number): Stage {
	return [...STAGES].reverse().find((s) => score >= s.from) ?? STAGES[0];
}

/** How far through the current stage, 0–1. Full at the final stage. */
export function stageProgress(score: number): number {
	const current = stageFor(score);
	const next = STAGES.find((s) => s.from > current.from);
	if (!next) return 1;
	return (score - current.from) / (next.from - current.from);
}

export function nextStage(score: number): Stage | null {
	const current = stageFor(score);
	return STAGES.find((s) => s.from > current.from) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Badges                                                                      */
/* -------------------------------------------------------------------------- */

export interface Badge {
	id: string;
	label: string;
	blurb: string;
	/** Icon name from $lib/components/Icon.svelte. */
	icon: string;
}

export interface BadgeContext {
	stats: GrassStats;
	/** True when this person tops the leaderboard. */
	isTopToucher?: boolean;
}

const RULES: { badge: Badge; earned: (c: BadgeContext) => boolean }[] = [
	{
		badge: {
			id: 'top-toucher',
			label: 'Top grass toucher',
			blurb: 'More activities than anyone else',
			icon: 'trophy'
		},
		earned: (c) => Boolean(c.isTopToucher) && c.stats.score > 0
	},
	{
		badge: {
			id: 'first-blade',
			label: 'First blade',
			blurb: 'Joined your first activity',
			icon: 'sprout'
		},
		earned: (c) => c.stats.score >= 1
	},
	{
		badge: { id: 'regular', label: 'Regular', blurb: 'Five activities in', icon: 'star' },
		earned: (c) => c.stats.score >= 5
	},
	{
		badge: { id: 'legend', label: 'Certified outside', blurb: 'Twenty activities', icon: 'crown' },
		earned: (c) => c.stats.score >= 20
	},
	{
		badge: { id: 'host', label: 'Green thumb', blurb: 'Hosted three activities', icon: 'leaf' },
		earned: (c) => c.stats.hosted >= 3
	},
	{
		badge: {
			id: 'outdoorsy',
			label: 'Actually outside',
			blurb: 'Three hangouts',
			icon: 'hangouts'
		},
		earned: (c) => (c.stats.byCategory.hangouts ?? 0) >= 3
	},
	{
		badge: { id: 'bulk', label: 'Bulk buyer', blurb: 'Three grocery runs', icon: 'groceries' },
		earned: (c) => (c.stats.byCategory.groceries ?? 0) >= 3
	},
	{
		badge: { id: 'driver', label: 'Designated driver', blurb: 'Three rides', icon: 'rides' },
		earned: (c) => (c.stats.byCategory.rides ?? 0) >= 3
	}
];

export function earnedBadges(context: BadgeContext): Badge[] {
	return RULES.filter((r) => r.earned(context)).map((r) => r.badge);
}

/** The nearest badge still to earn, for a "keep going" nudge. */
export function nextBadge(context: BadgeContext): Badge | null {
	return RULES.find((r) => !r.earned(context) && r.badge.id !== 'top-toucher')?.badge ?? null;
}

/* -------------------------------------------------------------------------- */
/* The garden itself                                                           */
/* -------------------------------------------------------------------------- */

export type PlantKind = 'blade' | 'bud' | 'flower';

export interface Plant {
	kind: PlantKind;
	/** 0–100 across the planter. */
	x: number;
	/** Relative height, 0.45–1. */
	height: number;
	/** How far the tip bends, -1 (left) to 1 (right). */
	lean: number;
	hue: number;
}

/** Deterministic pseudo-random so a garden looks the same on every render. */
function rng(seed: string) {
	let h = 2166136261;
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return () => {
		h += 0x6d2b79f5;
		let t = h;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * What grows in the planter. Blades come first, then buds, then flowers —
 * so the garden visibly fills in and then blossoms as the score climbs.
 */
export function garden(score: number, seed: string): Plant[] {
	// A few blades even at zero so the planter reads as soil, not a void.
	const blades = Math.min(34, 3 + score * 3);
	const buds = score >= 6 ? Math.min(6, score - 5) : 0;
	const flowers = score >= 10 ? Math.min(7, Math.floor((score - 8) / 2)) : 0;

	const random = rng(seed);
	const plants: Plant[] = [];

	const add = (kind: PlantKind, count: number) => {
		for (let i = 0; i < count; i++) {
			plants.push({
				kind,
				x: 4 + random() * 92,
				height: 0.45 + random() * 0.55,
				lean: (random() - 0.5) * 2, // -1..1, how far the tip bends

				hue: Math.round(random() * 40)
			});
		}
	};

	add('blade', blades);
	add('bud', buds);
	add('flower', flowers);

	return plants.sort((a, b) => a.x - b.x);
}
