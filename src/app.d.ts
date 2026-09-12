// See https://svelte.dev/docs/kit/types#app.d.ts
import type { LatLng, User } from '$lib/types';

declare global {
	namespace App {
		interface Locals {
			/**
			 * The signed-in user. Currently a stubbed demo user set in
			 * hooks.server.ts — swap that handle for a real Auth0 session lookup
			 * and everything downstream keeps working.
			 */
			user: User;
			/** What the feed ranks against: chosen interests plus learned ones. */
			interests: string[];
			/** Where the viewer is: the browser's fix if we have it, else their campus. */
			location: LatLng;
			locationSource: 'gps' | 'campus';
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
