import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { feedQueryFromUrl } from '$lib/feed-query';
import { createActivity, listActivities } from '$lib/server/db';
import { validateNewActivity } from '$lib/validate';

/** GET /api/activities?category=&campus=&q=&sort= — same filters as the feed. */
export const GET: RequestHandler = async ({ url, locals }) => {
	const viewer = {
		id: locals.user.id,
		location: locals.location,
		interests: locals.user.interests
	};
	return json(await listActivities(feedQueryFromUrl(url), viewer));
};

/** POST /api/activities — JSON body with the same fields as the create form. */
export const POST: RequestHandler = async ({ request, locals }) => {
	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return json({ errors: { form: 'Body must be JSON.' } }, { status: 400 });
	}

	if (typeof payload !== 'object' || payload === null) {
		return json({ errors: { form: 'Body must be a JSON object.' } }, { status: 400 });
	}

	const result = validateNewActivity(payload as Record<string, unknown>);
	if (!result.ok) return json({ errors: result.errors }, { status: 400 });

	return json(await createActivity(result.value, locals.user.id), { status: 201 });
};
