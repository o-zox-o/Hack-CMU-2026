/**
 * One place that turns a request's `locals` into the Viewer the store wants.
 *
 * It matters that this is shared: the viewer carries campus and account type,
 * which is what decides whether student-only activities are visible. A route
 * that built its own viewer and forgot those fields would quietly show a
 * general account the edu hub.
 */

import type { Viewer } from './store/types';

export function viewerFrom(locals: App.Locals): Viewer {
	return {
		id: locals.user.id,
		location: locals.location,
		interests: locals.interests,
		campus: locals.user.campus,
		accountType: locals.user.accountType
	};
}
