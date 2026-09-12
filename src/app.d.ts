// See https://svelte.dev/docs/kit/types#app.d.ts
import type { User } from '$lib/types';

declare global {
	namespace App {
		interface Locals {
			/**
			 * The signed-in user. Currently a stubbed demo user set in
			 * hooks.server.ts — swap that handle for a real Auth0 session lookup
			 * and everything downstream keeps working.
			 */
			user: User;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
