import type { LayoutServerLoad } from './$types';
import { isPast } from '$lib/format';
import { listActivities } from '$lib/server/db';

export const load = (({ locals }) => {
	const openOnCampus = listActivities({ campus: locals.user.campus }).filter(
		(a) => !a.isFull && !isPast(a.startsAt)
	).length;

	return { user: locals.user, openOnCampus };
}) satisfies LayoutServerLoad;
