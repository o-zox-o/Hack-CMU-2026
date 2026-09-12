// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Document } from 'mongodb';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: Document | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
