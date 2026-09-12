/**
 * Touch grass: the profile's progression.
 *
 * Every activity that actually happened is a blade of grass you touched. The
 * garden on your profile grows with the count, and badges mark the milestones.
 *
 * "Actually happened" means the host marked it complete, not just that the
 * start time went by. Posting a plan and letting it lapse grows nothing, so
 * the score can't be farmed by filling a calendar.
 *
 * Pure functions over ActivityView[], so the profile page, a future leaderboard
 * and any test can all use them without a database.
 */

import type { ActivityView, CategoryId } from './types';

/* -------------------------------------------------------------------------- */
/* Score                                                                       */
/* -------------------------------------------------------------------------- */

export interface GrassStats {
	/** Completed activities. This is the number the garden grows from. */
	score: number;
	/** Completed activities you hosted / joined. */
	hosted: number;
	joined: number;
	/** Same as `score`, named for what it means on the page. */
	touched: number;
	/** Signed up for, not yet confirmed as done. Planted, not grown. */
	growing: number;
	/**
	 * Started, but the host hasn't confirmed it happened. Worth surfacing:
	 * for a host these are theirs to mark, and for everyone else it explains
	 * why something they went to isn't counted yet.
	 */
	awaitingHost: number;
	byCategory: Partial<Record<CategoryId, number>>;
}

export function grassStats(hosting: ActivityView[], joined: ActivityView[]): GrassStats {
	const all = [...hosting, ...joined];
	const done = all.filter((a) => a.isComplete);

	const byCategory: Partial<Record<CategoryId, number>> = {};
	for (const a of done) byCategory[a.category] = (byCategory[a.category] ?? 0) + 1;

	return {
		score: done.length,
		hosted: hosting.filter((a) => a.isComplete).length,
		joined: joined.filter((a) => a.isComplete).length,
		touched: done.length,
		growing: all.length - done.length,
		awaitingHost: all.filter((a) => a.awaitingCompletion).length,
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
	/** True when this person is in the top slice of grass touchers. */
	isTopPercent?: boolean;
}

/**
 * `standing` marks a badge that reflects where you are right now rather than
 * something you did once. It can be lost when other people catch up, so it is
 * never congratulated and never offered as the next one to chase.
 */
const RULES: { badge: Badge; standing?: boolean; earned: (c: BadgeContext) => boolean }[] = [
	{
		badge: {
			id: 'top-toucher',
			label: 'Top grass toucher',
			blurb: 'In the top 1% of everyone touching grass',
			icon: 'trophy'
		},
		standing: true,
		earned: (c) => Boolean(c.isTopPercent) && c.stats.score > 0
	},
	{
		badge: {
			id: 'first-blade',
			label: 'First blade',
			blurb: 'First activity that actually happened',
			icon: 'sprout'
		},
		earned: (c) => c.stats.score >= 1
	},
	{
		badge: { id: 'regular', label: 'Regular', blurb: 'Five activities done', icon: 'star' },
		earned: (c) => c.stats.score >= 5
	},
	{
		badge: {
			id: 'legend',
			label: 'Certified outside',
			blurb: 'Twenty activities done',
			icon: 'crown'
		},
		earned: (c) => c.stats.score >= 20
	},
	{
		badge: { id: 'host', label: 'Green thumb', blurb: 'Hosted three that happened', icon: 'leaf' },
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
	},
	{
		badge: { id: 'sporty', label: 'Team player', blurb: 'Three sports sessions', icon: 'sports' },
		earned: (c) => (c.stats.byCategory.sports ?? 0) >= 3
	}
];

export function earnedBadges(context: BadgeContext): Badge[] {
	return RULES.filter((r) => r.earned(context)).map((r) => r.badge);
}

/**
 * The ones you keep. These depend only on your own record, so they can be
 * worked out without looking at anybody else, which is what makes it cheap
 * enough to check on every page load.
 */
export function milestoneBadges(stats: GrassStats): Badge[] {
	return RULES.filter((r) => !r.standing && r.earned({ stats })).map((r) => r.badge);
}

/** The nearest badge still to earn, for a "keep going" nudge. */
export function nextBadge(context: BadgeContext): Badge | null {
	return RULES.find((r) => !r.standing && !r.earned(context))?.badge ?? null;
}

/** The line that goes in the congratulations when one lands. */
export function badgeMessage(badge: Badge, score: number): string {
	return `Congrats, you earned ${badge.label}! You've touched grass ${score} ${
		score === 1 ? 'time' : 'times'
	}.`;
}

/* -------------------------------------------------------------------------- */
/* Standing                                                                    */
/* -------------------------------------------------------------------------- */

/** The slice that counts as "top". */
export const TOP_SLICE = 0.01;

/**
 * How many people are in that slice. Always at least one, so the leader still
 * stands out before the app has a hundred users: 1% of nine people is nobody,
 * which would make the badge unreachable for the whole of a demo.
 */
export function topSliceSize(total: number): number {
	return Math.max(1, Math.ceil(total * TOP_SLICE));
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
