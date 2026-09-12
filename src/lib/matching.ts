// src/lib/matching.ts
import type { User, Activity } from './types';

// 1. Jaccard Similarity for Tags / Interests -- good score is about 70%+
export function jaccardSimilarity(arrA: string[], arrB: string[]): number {
  if (!arrA.length || !arrB.length) return 0;
  const setA = new Set(arrA.map((s) => s.toLowerCase()));
  const setB = new Set(arrB.map((s) => s.toLowerCase()));
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// 2. Interpersonal Fit: Applicant vs. Activity Creator (No age penalty)
export function calculateUserFit(applicant: User, creator: User): number {
  const interestScore = jaccardSimilarity(applicant.interests, creator.interests);
  
  // School affinity: 1.0 if same university, 0.7 base trust if different verified schools
  const sameSchool = applicant.university.trim().toLowerCase() === creator.university.trim().toLowerCase();
  const schoolBonus = sameSchool ? 1.0 : 0.7;

  // 75% interest synergy + 25% same-campus affinity
  return 0.75 * interestScore + 0.25 * schoolBonus;
}

// 3. Activity Fit: Applicant vs. Activity Specs (Includes Capacity & Hard Filters)
export function calculateActivityFit(
  applicant: User,
  activity: Activity,
  applicantBudget?: number
): number {
  // Hard Constraint A: Is the activity full?
  if (activity.memberIds && activity.memberIds.length >= activity.maxMembers) {
    return 0;
  }

  // Hard Constraint B: Gender preference
  if (
    activity.preferredGender &&
    activity.preferredGender.toLowerCase() !== 'any' &&
    activity.preferredGender.toLowerCase() !== applicant.gender.toLowerCase()
  ) {
    return 0;
  }

  // Hard Constraint C: Age boundary constraints
  if (activity.minAge && applicant.age < activity.minAge) return 0;
  if (activity.maxAge && applicant.age > activity.maxAge) return 0;

  // Soft Score A: Interest overlap
  const interestScore = jaccardSimilarity(applicant.interests, activity.interests);

  // Soft Score B: Budget alignment
  if (applicantBudget === undefined || applicantBudget === null) {
    // If no budget supplied, base activity fit purely on interest match
    return interestScore;
  }

  let budgetScore = 1.0;
  if (activity.budget > 0) {
    const diffRatio = Math.abs(applicantBudget - activity.budget) / activity.budget;
    budgetScore = Math.max(0, 1 - diffRatio);
  }

  return 0.7 * interestScore + 0.3 * budgetScore;
}

// 4. Composite Match Function
export function getCompositeScore(
  applicant: User,
  activity: Activity,
  creator: User,
  applicantBudget?: number
): number {
  const actFit = calculateActivityFit(applicant, activity, applicantBudget);
  if (actFit === 0) return 0; // Disqualified by hard filters or zero capacity

  const userFit = calculateUserFit(applicant, creator);
  return Math.round((0.6 * actFit + 0.4 * userFit) * 100);
}

//TEST BLOCK - DELETE LATER
import { mockCurrentUser, mockUsers, mockActivities } from './mockData';

console.log('--- Testing Matching Algorithm ---');

// Test applicant vs activity
const sampleActivity = mockActivities[0];
const actScore = calculateActivityFit(mockCurrentUser, sampleActivity);
console.log(`Activity Fit (${sampleActivity.location}):`, Math.round(actScore * 100) + '%');

// Test applicant vs owner
const sampleOwner = mockUsers[sampleActivity.creatorId];
const userScore = calculateUserFit(mockCurrentUser, sampleOwner);
console.log(`User Fit with Host (${sampleOwner.name}):`, Math.round(userScore * 100) + '%');

// Combined weighted score
const finalScore = Math.round((0.6 * actScore + 0.4 * userScore) * 100);
console.log(`Composite Match Score:`, finalScore + '%');