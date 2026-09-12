/**
 * Types for the matching algorithm (matching.ts / mockData.ts).
 *
 * These describe the richer profile the matcher wants — interests, age,
 * budget — which the app's `User` / `Activity` in types.ts don't carry yet.
 * When those fields land on the real models, point matching.ts back at
 * $lib/types and delete this file.
 */

export interface User {
	id: string;
	auth0Id: string;
	name: string;
	email: string;
	university: string;
	age: number;
	gender: string;
	interests: string[];
	location: string;
}

export interface Activity {
	id: string;
	creatorId: string;
	memberIds: string[];
	title: string;
	description: string;
	location: string;
	startDate: string;
	endDate: string;
	budget: number;
	interests: string[];
	maxMembers: number;
	preferredGender?: string;
	minAge?: number;
	maxAge?: number;
}
