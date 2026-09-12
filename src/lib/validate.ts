/**
 * Form/API validation for activities.
 *
 * Shared by `/activities/new`, `/activities/[id]/edit` and
 * `POST /api/activities` so they all reject the same things with the same
 * messages. Returns field-keyed errors, which is what the forms need to
 * render inline messages.
 */

import { parseCents } from './format';
import {
	isCampusId,
	isCategoryId,
	isStudentOnly,
	isVisibility,
	type CostBasis,
	type NewActivityInput,
	type SignupInput,
	type Visibility
} from './types';

export const MAX_SPOTS = 20;
const MAX_TITLE = 120;
const MAX_BODY = 2000;

export type FieldErrors = Partial<Record<keyof NewActivityInput | 'form', string>>;

export type ValidationResult =
	{ ok: true; value: NewActivityInput } | { ok: false; errors: FieldErrors };

/**
 * What an edit has to respect that a fresh post doesn't: people are already
 * in, and the start time may already be behind us.
 */
export interface ActivityRules {
	/** Spots can't drop below the people already holding one. */
	minSpots?: number;
	/** An activity that has started can still be edited — its own date is fine. */
	allowPastStart?: boolean;
	/**
	 * Whether the poster may use the student-only tiers. Checked here and not
	 * only in the form: the API takes the same fields, and a general account
	 * must not be able to post into the edu hub by sending JSON.
	 */
	student?: boolean;
}

/** Pull a trimmed string out of FormData or a JSON object. */
function str(source: FormData | Record<string, unknown>, key: string): string {
	const raw = source instanceof FormData ? source.get(key) : source[key];
	return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * Read a checkbox. FormData omits an unchecked box entirely and sends "on"
 * when it's ticked; the JSON API sends a real boolean.
 */
function bool(source: FormData | Record<string, unknown>, key: string): boolean {
	if (source instanceof FormData) {
		const raw = source.get(key);
		return raw !== null && raw !== 'false' && raw !== '';
	}
	return source[key] === true || source[key] === 'true' || source[key] === 'on';
}

export function validateActivity(
	source: FormData | Record<string, unknown>,
	rules: ActivityRules = {}
): ValidationResult {
	const errors: FieldErrors = {};

	const title = str(source, 'title');
	if (title.length < 4) errors.title = 'Give it a title people can scan. At least 4 characters.';
	else if (title.length > MAX_TITLE) errors.title = `Keep the title under ${MAX_TITLE} characters.`;

	const body = str(source, 'body');
	if (body.length > MAX_BODY) errors.body = `Keep the details under ${MAX_BODY} characters.`;

	const category = str(source, 'category');
	if (!isCategoryId(category)) errors.category = 'Pick a category.';

	const campus = str(source, 'campus');
	if (!isCampusId(campus)) errors.campus = 'Pick a campus.';

	const location = str(source, 'location');
	if (location.length < 2) errors.location = 'Where are you meeting? "Online" is fine.';

	/* `datetime-local` gives "2026-09-19T16:30" with no zone, so parsing it here
	   reads it in the SERVER's timezone, not the person's. On a UTC host that
	   turns a Pittsburgh afternoon into that morning and rejects it as already
	   past. Only the browser knows the right offset for that particular date,
	   DST included, so it resolves the instant and sends it in `startsAtUtc`.
	   The naive field stays the fallback for a submit without JavaScript, where
	   the two zones agreeing is the best we can do. */
	const startsAtRaw = str(source, 'startsAt');
	const startsAtUtc = str(source, 'startsAtUtc');
	let startsAt = '';

	const usable = (value: string): Date | null => {
		if (!value) return null;
		const d = new Date(value);
		return Number.isNaN(d.getTime()) ? null : d;
	};
	const parsedDate = usable(startsAtUtc) ?? usable(startsAtRaw);

	if (!parsedDate) {
		errors.startsAt = 'Pick a date and time.';
	} else if (!rules.allowPastStart && parsedDate.getTime() < Date.now() - 60_000) {
		errors.startsAt = 'That time has already passed.';
	} else {
		startsAt = parsedDate.toISOString();
	}

	const spotsRaw = str(source, 'spots');
	const spots = Number(spotsRaw);
	const floor = Math.max(2, rules.minSpots ?? 0);
	if (!Number.isInteger(spots) || spots < floor) {
		errors.spots =
			floor > 2
				? `${floor} people are already in, so you can't go below that.`
				: 'You need room for at least 2 people (including you).';
	} else if (spots > MAX_SPOTS) {
		errors.spots = `${MAX_SPOTS} spots is the cap.`;
	}

	// Money is integer cents everywhere. Parse once, here.
	const costCents = parseCents(str(source, 'cost'));
	if (costCents === null) errors.costCents = 'Enter an amount like 12 or 12.50.';

	const costBasisRaw = str(source, 'costBasis');
	const costBasis: CostBasis = costBasisRaw === 'total' ? 'total' : 'per-person';

	// Anything unrecognised is public — the safe default is the one that
	// doesn't silently hide someone's activity from the feed.
	const visibilityRaw = str(source, 'visibility');
	const visibility: Visibility = isVisibility(visibilityRaw) ? visibilityRaw : 'public';
	const approvalRequired = bool(source, 'approvalRequired');

	// Never quietly widen this to 'public': that would publish something the
	// host meant to keep inside their school.
	if (isStudentOnly(visibility) && rules.student === false) {
		errors.visibility = 'Student-only activities need a verified .edu address.';
	}

	if (Object.keys(errors).length > 0) return { ok: false, errors };

	return {
		ok: true,
		value: {
			title,
			body,
			category: category as NewActivityInput['category'],
			campus: campus as NewActivityInput['campus'],
			location,
			startsAt,
			spots,
			costCents: costCents as number,
			costBasis,
			visibility,
			approvalRequired
		}
	};
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export type AuthErrors = Partial<Record<keyof SignupInput | 'form', string>>;
const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(
	form: FormData
): { ok: true; email: string; password: string } | { ok: false; errors: AuthErrors } {
	const email = str(form, 'email').toLowerCase();
	const password = typeof form.get('password') === 'string' ? (form.get('password') as string) : '';
	const errors: AuthErrors = {};
	if (!EMAIL_RE.test(email)) errors.email = 'Enter your email address.';
	if (password.length === 0) errors.password = 'Enter your password.';
	if (Object.keys(errors).length) return { ok: false, errors };
	return { ok: true, email, password };
}

/**
 * `isStudentEmail` decides the account's tier. Anyone may sign up; only a
 * verified .edu address gets into the edu hub, so this is not a gate, it's a
 * label. The caller passes the check in so validation stays free of server
 * imports.
 */
export function validateSignup(
	form: FormData,
	isStudentEmail: (email: string) => boolean
): { ok: true; value: SignupInput } | { ok: false; errors: AuthErrors } {
	const name = str(form, 'name');
	const email = str(form, 'email').toLowerCase();
	const campus = str(form, 'campus');
	const password = typeof form.get('password') === 'string' ? (form.get('password') as string) : '';
	const errors: AuthErrors = {};

	if (name.length < 2) errors.name = 'What should people call you?';
	else if (name.length > 60) errors.name = 'Keep it under 60 characters.';
	if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
	if (!isCampusId(campus)) errors.campus = 'Pick your campus.';
	if (password.length < MIN_PASSWORD) errors.password = `At least ${MIN_PASSWORD} characters.`;

	if (Object.keys(errors).length) return { ok: false, errors };
	// Interests are collected on /welcome, right after this.
	return {
		ok: true,
		value: {
			name,
			email,
			campus: campus as SignupInput['campus'],
			accountType: isStudentEmail(email) ? 'student' : 'general',
			password,
			interests: []
		}
	};
}
