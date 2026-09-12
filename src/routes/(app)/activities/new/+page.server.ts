import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createActivity } from '$lib/server/db';
import { validateNewActivity } from '$lib/validate';

export const load = (({ locals }) => {
	return { defaultCampus: locals.user.campus };
}) satisfies PageServerLoad;

const FIELDS = [
	'title',
	'body',
	'category',
	'campus',
	'location',
	'startsAt',
	'spots',
	'cost',
	'costBasis'
] as const;

export const actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const result = validateNewActivity(form);

		if (!result.ok) {
			// Echo the typed values back so the form doesn't blank on error.
			const values = Object.fromEntries(
				FIELDS.map((key) => [key, String(form.get(key) ?? '')])
			) as Record<(typeof FIELDS)[number], string>;

			return fail(400, { errors: result.errors, values });
		}

		const created = createActivity(result.value, locals.user.id);
		redirect(303, `/activities/${created.id}`);
	}
} satisfies Actions;
