// src/lib/matching.ts
import type { User, ActivityView } from './types';

// 1. Tag Similarity: Overlap coverage (avoids penalizing users with many interests)
export function activityTagCoverage(userInterests: string[], activityInterests: string[]): number {
	if (!activityInterests || !activityInterests.length) return 0.5;
	if (!userInterests || !userInterests.length) return 0;

	const userSet = new Set(userInterests.map((s) => s.toLowerCase()));
	const matches = activityInterests.filter((tag) => userSet.has(tag.toLowerCase())).length;

	return matches / activityInterests.length;
}

// 2. User vs Host Interpersonal Fit (Jaccard for mutual interests + Campus affinity)
export function calculateUserFit(applicant: User, host: User): number {
	if (!applicant.interests?.length || !host.interests?.length) {
		return applicant.campus === host.campus ? 1.0 : 0.7;
	}

	const setA = new Set(applicant.interests.map((s) => s.toLowerCase()));
	const setB = new Set(host.interests.map((s) => s.toLowerCase()));
	const intersection = [...setA].filter((x) => setB.has(x)).length;
	const union = new Set([...setA, ...setB]).size;
	const interestScore = union === 0 ? 0 : intersection / union;

	const schoolBonus = applicant.campus === host.campus ? 1.0 : 0.7;
	return 0.75 * interestScore + 0.25 * schoolBonus;
}

// 3. Activity Fit (Directly evaluates pre-computed ActivityView fields)
export function calculateActivityFit(
	applicant: User,
	activity: ActivityView,
	applicantBudgetDollars?: number
): number {
	// Precomputed hard constraint from server
	if (activity.isFull) return 0;

	// Tag similarity with fallback to category match
	let interestScore = 0;
	if (activity.interests && activity.interests.length > 0) {
		interestScore = activityTagCoverage(applicant.interests, activity.interests);
	} else if (activity.category) {
		const hasCategory = applicant.interests.some(
			(i) => i.toLowerCase() === activity.category.toLowerCase()
		);
		interestScore = hasCategory ? 0.9 : 0.4;
	}

	if (applicantBudgetDollars === undefined || applicantBudgetDollars === null) {
		return interestScore;
	}

	const costDollars = activity.costCents / 100;
	let budgetScore = 1.0;
	if (costDollars > 0) {
		const diffRatio = Math.abs(applicantBudgetDollars - costDollars) / costDollars;
		budgetScore = Math.max(0, 1 - diffRatio);
	}

	return 0.7 * interestScore + 0.3 * budgetScore;
}

// 4. Primary Ranking Entrypoint for the UI Feed
export function rankActivityView(
	viewer: User,
	activity: ActivityView,
	viewerBudgetDollars?: number
): number {
	const actFit = calculateActivityFit(viewer, activity, viewerBudgetDollars);
	if (actFit === 0) return 0;

	// Host is already populated on ActivityView
	const hostFit = calculateUserFit(viewer, activity.host);
	return Math.round((0.6 * actFit + 0.4 * hostFit) * 100);
}