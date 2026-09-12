import type { Actions, PageServerLoad } from './$types';
import { activitiesHostedBy, activitiesJoinedBy, getUser, listUsers } from '$lib/server/db';

export const load = (({ locals }) => {
	return {
		hosting: activitiesHostedBy(locals.user.id, locals.user.id),
		joined: activitiesJoinedBy(locals.user.id, locals.user.id),
		// DEV ONLY — lets you switch identity to test joining. Remove with auth.
		demoUsers: listUsers().map((u) => ({ id: u.id, name: u.name }))
	};
}) satisfies PageServerLoad;

export const actions = {
	/** DEV ONLY — sets the `demo_user` cookie read by hooks.server.ts. */
	switchUser: async ({ request, cookies }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (getUser(id)) {
			cookies.set('demo_user', id, { path: '/', httpOnly: true, sameSite: 'lax' });
		}
		return {};
	}
} satisfies Actions;
