// src/lib/matching.ts
import type { User, ActivityView, Activity } from './types';

// 1. Jaccard Similarity for Tag/Interest Sets - good score is usually 70%
export function jaccardSimilarity(arrA: string[], arrB: string[]): number {
  if (!arrA.length || !arrB.length) return 0;
  const setA = new Set(arrA.map((s) => s.toLowerCase()));
  const setB = new Set(arrB.map((s) => s.toLowerCase()));
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// 2. Interpersonal Synergy (Applicant vs. Host)
export function calculateUserFit(applicant: User, host: User): number {
  const interestScore = jaccardSimilarity(applicant.interests, host.interests);

  // University affinity
  const sameSchool =
    applicant.university.trim().toLowerCase() === host.university.trim().toLowerCase();
  const schoolBonus = sameSchool ? 1.0 : 0.7;

  return 0.75 * interestScore + 0.25 * schoolBonus;
}

// 3. Activity Fit (Handles ActivityView from the UI feed)
export function calculateActivityFit(
  applicant: User,
  activity: ActivityView | Activity,
  applicantBudgetDollars?: number
): number {
  // Hard Constraint: Full capacity check
  if ('isFull' in activity && activity.isFull) return 0;
  if ('maxMembers' in activity && activity.maxMembers !== undefined) {
    if (activity.memberIds.length >= activity.maxMembers) return 0;
  }

  // Soft Score A: Category or Tag Overlap
  let interestScore = 0;
  if ('interests' in activity && activity.interests?.length) {
    interestScore = jaccardSimilarity(applicant.interests, activity.interests);
  } else if ('category' in activity) {
    // Check if user interests include the category name (e.g., 'food', 'rides')
    const hasCategory = applicant.interests.some(
      (i) => i.toLowerCase() === activity.category.toLowerCase()
    );
    interestScore = hasCategory ? 1.0 : 0.4;
  }

  // Soft Score B: Budget alignment
  if (applicantBudgetDollars === undefined || applicantBudgetDollars === null) {
    return interestScore;
  }

  // Normalize cost into dollars
  const costDollars = 'costCents' in activity ? activity.costCents / 100 : activity.budget;

  let budgetScore = 1.0;
  if (costDollars > 0) {
    const diffRatio = Math.abs(applicantBudgetDollars - costDollars) / costDollars;
    budgetScore = Math.max(0, 1 - diffRatio);
  }

  return 0.7 * interestScore + 0.3 * budgetScore;
}

// 4. Composite Ranking Score for UI Feeds
export function rankActivityView(
  viewer: User,
  activity: ActivityView,
  viewerBudgetDollars?: number
): number {
  const actFit = calculateActivityFit(viewer, activity, viewerBudgetDollars);
  if (actFit === 0) return 0;

  // activity.host is already populated in ActivityView
  const hostFit = calculateUserFit(viewer, activity.host);
  return Math.round((0.6 * actFit + 0.4 * hostFit) * 100);
}