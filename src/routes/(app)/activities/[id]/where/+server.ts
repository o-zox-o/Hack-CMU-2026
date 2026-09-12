/**
 * Live location for one activity: where everyone is, while it's happening.
 *
 *   GET    everyone currently sharing (members only)
 *   POST   { lat, lng } — put me on the map, or refresh my point
 *   DELETE take me off it
 *
 * Polled rather than pushed. WebSockets don't work on serverless, and an SSE
 * stream holds a function open per viewer; a short poll costs nothing when
 * nobody is looking, which is almost always.
 *
 * Every rule is enforced here and in the store, never in the client: the
 * client decides when to ask, not who may see.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { activityLocations, shareLocation, stopSharing } from '$lib/server/db';
import { LOCATION_TTL_SECONDS } from '$lib/types';

const SHARE_MESSAGES = {
	'not-found': 'That activity is gone.',
	'not-a-member': 'Only people in this activity can share their location.',
	closed: "Sharing isn't open for this activity right now.",
	'bad-position': "That doesn't look like a real position."
} as const;

export const GET: RequestHandler = async ({ params, locals }) => {
	const people = await activityLocations(params.id, locals.user.id);
	return json({ people, ttlSeconds: LOCATION_TTL_SECONDS });
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Body must be JSON.' }, { status: 400 });
	}

	const { lat, lng } = (body ?? {}) as { lat?: unknown; lng?: unknown };
	if (typeof lat !== 'number' || typeof lng !== 'number') {
		return json({ error: 'lat and lng must be numbers.' }, { status: 400 });
	}

	const result = await shareLocation(params.id, locals.user.id, lat, lng);
	if (!result.ok) return json({ error: SHARE_MESSAGES[result.reason] }, { status: 409 });

	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	await stopSharing(params.id, locals.user.id);
	return json({ ok: true });
};
