import { generateTags } from '$lib/server/ai';

import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createActivity } from '$lib/server/db';
import { validateActivity } from '$lib/validate';
import { isStudent } from '$lib/types';

export const load = (({ locals }) => {
	return { defaultCampus: locals.user.campus, student: isStudent(locals.user) };
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
	'costBasis',
	'visibility'
] as const;

export const actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const result = validateActivity(form, { student: isStudent(locals.user) });

		if (!result.ok) {
			// Echo the typed values back so the form doesn't blank on error.
			const values = {
				...(Object.fromEntries(FIELDS.map((key) => [key, String(form.get(key) ?? '')])) as Record<
					(typeof FIELDS)[number],
					string
				>),
				// An unticked checkbox isn't in the form data at all.
				approvalRequired: form.get('approvalRequired') !== null
			};

			return fail(400, { errors: result.errors, values });
		}

		// 1. Generate tags with Gemini
		const context = `Category: ${result.value.category}. Title: ${result.value.title}. Description: ${result.value.body}`;
		const aiTags = await generateTags(context);

		const created = await createActivity({ ...result.value, interests: aiTags }, locals.user.id);

		redirect(303, `/activities/${created.id}`);
	}
} satisfies Actions;
