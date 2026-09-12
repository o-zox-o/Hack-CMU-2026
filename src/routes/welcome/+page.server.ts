import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { updateProfile } from '$lib/server/db';
import { campusMeta, isInterest } from '$lib/types';

/** Only same-origin relative paths are allowed as a destination. */
function safeNext(raw: string | null): string {
	return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

export const load = (({ locals, url }) => {
	return {
		next: safeNext(url.searchParams.get('next')),
		/** Their campus city, offered as a starting point for the city field. */
		suggestedCity: `${campusMeta(locals.user.campus).city}, PA`
	};
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request, locals, url }) => {
		const form = await request.formData();

		await updateProfile(locals.user.id, {
			bio: String(form.get('bio') ?? '')
				.trim()
				.slice(0, 300),
			location: String(form.get('location') ?? '')
				.trim()
				.slice(0, 80),
			interests: [...new Set(form.getAll('interests').filter(isInterest))].slice(0, 12)
		});

		redirect(303, safeNext(url.searchParams.get('next')));
	}
} satisfies Actions;
