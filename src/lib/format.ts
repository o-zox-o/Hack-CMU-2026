import type { CostBasis } from './types';

/** Integer cents -> "$12.50". Drops the cents when it is a round dollar. */
export function formatCents(cents: number): string {
	const dollars = cents / 100;
	return dollars.toLocaleString('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
		maximumFractionDigits: 2
	});
}

/** "$4 each" / "$40 total": the price as it should read on a card. */
export function formatPrice(cents: number, basis: CostBasis): string {
	if (cents === 0) return 'Free';
	return `${formatCents(cents)} ${basis === 'per-person' ? 'each' : 'total'}`;
}

/**
 * What one person pays, given the price basis and how many are in.
 * A `total` split across 4 people is 1/4 each — rounded UP so the group never
 * collects less than the bill.
 */
export function perPersonCents(cents: number, basis: CostBasis, headcount: number): number {
	if (basis === 'per-person') return cents;
	return Math.ceil(cents / Math.max(1, headcount));
}

/**
 * The other half of the price, worked out from the one number the host typed:
 * what one person pays when they gave a total, or what the group pays when
 * they gave a per-person price.
 *
 * Always against the full spot count, never how many have joined so far. The
 * split is the deal being advertised, and "$30 each with 1 in" is both alarming
 * and wrong about what anyone will actually pay.
 *
 * Null when there's nothing to work out: free, or a group of one.
 */
export function costSplit(cents: number, basis: CostBasis, spots: number): string | null {
	if (cents === 0 || !Number.isFinite(spots) || spots < 2) return null;

	if (basis === 'per-person') return `${formatCents(cents * spots)} total if ${spots} come`;

	// "≈" only when it really is approximate. The split rounds up so the group
	// never collects less than the bill, but $35 across 5 is exactly $7.
	const each = perPersonCents(cents, 'total', spots);
	const rounded = cents % spots !== 0;
	return `${rounded ? '≈ ' : ''}${formatCents(each)} each if ${spots} come`;
}

/** Integer cents -> what belongs in the "$" input: "12", "12.50", or "" for free. */
export function centsToInput(cents: number): string {
	if (cents === 0) return '';
	return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/** "2h ago", "3d ago" — Reddit's post-age stamp. */
export function timeAgo(iso: string, now: Date = new Date()): string {
	const seconds = Math.floor((now.getTime() - new Date(iso).getTime()) / 1000);
	if (seconds < 60) return 'just now';
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	if (months < 12) return `${months}mo ago`;
	return `${Math.floor(months / 12)}y ago`;
}

/** "Today 4:30 PM", "Tomorrow 9:00 AM", "Fri, Sep 19, 4:30 PM". */
export function formatWhen(iso: string, now: Date = new Date()): string {
	const date = new Date(iso);
	const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

	const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
	const dayDiff = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000);

	if (dayDiff === 0) return `Today ${time}`;
	if (dayDiff === 1) return `Tomorrow ${time}`;
	if (dayDiff === -1) return `Yesterday ${time}`;

	const day = date.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric'
	});
	return `${day}, ${time}`;
}

/** Has the meetup time already passed? */
export function isPast(iso: string, now: Date = new Date()): boolean {
	return new Date(iso).getTime() < now.getTime();
}

/**
 * Parse a money string ("12", "12.50", "$12.50") into integer cents.
 * Returns null when it is not a usable amount.
 */
export function parseCents(input: string): number | null {
	const cleaned = input.trim().replace(/[$,\s]/g, '');
	if (cleaned === '') return 0;
	if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
	return Math.round(Number(cleaned) * 100);
}

/** Deterministic initials for the avatar bubble. */
export function initials(name: string): string {
	const parts = name.trim().split(/\s+/).slice(0, 2);
	return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

/** "2:30 PM" — just the clock, for something happening today. */
export function formatClock(iso: string): string {
	return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Format a Date for `<input type="datetime-local">`, which wants local time
 * as "YYYY-MM-DDTHH:mm" with no zone suffix.
 */
export function toLocalInputValue(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Distance when you're trying to find someone, not browse a feed. Metres up
 * close, because "< 0.1 mi" is useless when you're both at the same rink.
 */
export function formatNearby(miles: number): string {
	const metres = miles * 1609.34;
	if (metres < 20) return 'right here';
	if (metres < 950) return `${Math.round(metres / 10) * 10} m`;
	return formatMiles(miles);
}

/** "0.4 mi", "12 mi", "1.2k mi". */
export function formatMiles(miles: number): string {
	if (miles < 0.05) return '< 0.1 mi';
	if (miles < 10) return `${miles.toFixed(1)} mi`;
	if (miles < 1000) return `${Math.round(miles)} mi`;
	return `${(miles / 1000).toFixed(1)}k mi`;
}
