/**
 * Form/API validation for new activities.
 *
 * Shared by the `/activities/new` form action and `POST /api/activities` so
 * both reject the same things with the same messages. Returns field-keyed
 * errors, which is what the form needs to render inline messages.
 */

import { parseCents } from './format';
import { isCampusId, isCategoryId, type CostBasis, type NewActivityInput } from './types';

export const MAX_SPOTS = 20;
const MAX_TITLE = 120;
const MAX_BODY = 2000;

export type FieldErrors = Partial<Record<keyof NewActivityInput | 'form', string>>;

export type ValidationResult =
	{ ok: true; value: NewActivityInput } | { ok: false; errors: FieldErrors };

/** Pull a trimmed string out of FormData or a JSON object. */
function str(source: FormData | Record<string, unknown>, key: string): string {
	const raw = source instanceof FormData ? source.get(key) : source[key];
	return typeof raw === 'string' ? raw.trim() : '';
}

export function validateNewActivity(source: FormData | Record<string, unknown>): ValidationResult {
	const errors: FieldErrors = {};

	const title = str(source, 'title');
	if (title.length < 4) errors.title = 'Give it a title people can scan — at least 4 characters.';
	else if (title.length > MAX_TITLE) errors.title = `Keep the title under ${MAX_TITLE} characters.`;

	const body = str(source, 'body');
	if (body.length > MAX_BODY) errors.body = `Keep the details under ${MAX_BODY} characters.`;

	const category = str(source, 'category');
	if (!isCategoryId(category)) errors.category = 'Pick a category.';

	const campus = str(source, 'campus');
	if (!isCampusId(campus)) errors.campus = 'Pick a campus.';

	const location = str(source, 'location');
	if (location.length < 2) errors.location = 'Where are you meeting? "Online" is fine.';

	// `datetime-local` gives "2026-09-19T16:30" — no zone, so it is read as local
	// time, which is what the user meant.
	const startsAtRaw = str(source, 'startsAt');
	let startsAt = '';
	const parsedDate = startsAtRaw ? new Date(startsAtRaw) : null;
	if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
		errors.startsAt = 'Pick a date and time.';
	} else if (parsedDate.getTime() < Date.now() - 60_000) {
		errors.startsAt = 'That time has already passed.';
	} else {
		startsAt = parsedDate.toISOString();
	}

	const spotsRaw = str(source, 'spots');
	const spots = Number(spotsRaw);
	if (!Number.isInteger(spots) || spots < 2) {
		errors.spots = 'You need room for at least 2 people (including you).';
	} else if (spots > MAX_SPOTS) {
		errors.spots = `${MAX_SPOTS} spots is the cap.`;
	}

	// Money is integer cents everywhere. Parse once, here.
	const costCents = parseCents(str(source, 'cost'));
	if (costCents === null) errors.costCents = 'Enter an amount like 12 or 12.50.';

	const costBasisRaw = str(source, 'costBasis');
	const costBasis: CostBasis = costBasisRaw === 'total' ? 'total' : 'per-person';

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
			costBasis
		}
	};
}
