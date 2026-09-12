/**
 * Working out which badges are new to someone.
 *
 * Badges are earned by things other people do: a host marking an activity
 * complete grows the garden of everyone who came, not just their own. So
 * there's no single action to hang the congratulations off, and the check
 * runs on page load instead, in the app layout.
 *
 * Only the milestone badges are checked here. The standing badge (top 1%)
 * moves as other people catch up, so it isn't something you earn once, and
 * congratulating it would mean congratulating it again every time it came
 * back. It's shown as a badge, never announced.
 */

import { activitiesHostedBy, activitiesJoinedBy, markBadgesSeen } from './db';
import { badgeMessage, grassStats, milestoneBadges } from '$lib/grass';

/** Past this many at once, they're summarised instead of played one by one. */
const PARADE_LIMIT = 2;

/**
 * Badges earned since this user was last looked at, as ready-to-show lines.
 * Marks them seen on the way through, so each one fires exactly once.
 *
 * A pile-up gets one line rather than a queue: an account whose whole history
 * lands at once (a first login against seeded data, or a host confirming a
 * backlog) would otherwise sit through a minute of confetti. They're all on
 * the profile either way.
 */
export async function claimNewBadges(userId: string): Promise<string[]> {
	const [hosting, joined] = await Promise.all([
		activitiesHostedBy(userId),
		activitiesJoinedBy(userId)
	]);

	const stats = grassStats(hosting, joined);
	if (stats.score === 0) return [];

	const earned = milestoneBadges(stats);
	const fresh = new Set(
		await markBadgesSeen(
			userId,
			earned.map((b) => b.id)
		)
	);

	const landed = earned.filter((b) => fresh.has(b.id));
	if (landed.length === 0) return [];

	if (landed.length > PARADE_LIMIT) {
		return [
			`Congrats, you earned ${landed.length} badges! You've touched grass ${stats.score} ${
				stats.score === 1 ? 'time' : 'times'
			}.`
		];
	}
	return landed.map((b) => badgeMessage(b, stats.score));
}
