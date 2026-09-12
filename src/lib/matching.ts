export interface User {
  id: string;
  auth0Id: string;
  name: string;
  email: string;
  university: string;
  gender: string;
  interests: string[];
  age: number;
  location: number;
  budget?: number; // Needed if user has a default budget
}

export interface Activity {
  id: string;
  ownerId: string;
  destination: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: number;
  interests: string[];
}

// 1. Jaccard Similarity for Tags / Interests
//generally a good score is 70% and above
function jaccardSimilarity(arrA: string[], arrB: string[]): number {
  if (!arrA.length || !arrB.length) return 0;
  const setA = new Set(arrA.map((s) => s.toLowerCase()));
  const setB = new Set(arrB.map((s) => s.toLowerCase()));
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// 2. Interpersonal Fit: Applicant vs. Activity Owner
export function calculateUserFit(applicant: User, owner: User): number {
  const interestScore = jaccardSimilarity(applicant.interests, owner.interests);
  const ageDiff = Math.abs(applicant.age - owner.age);
  const ageScore = Math.max(0, 1 - ageDiff / 6);
  const schoolBonus = applicant.university.toLowerCase() === owner.university.toLowerCase() ? 1.0 : 0.7;

  return 0.5 * interestScore + 0.3 * ageScore + 0.2 * schoolBonus;
}

// 3. Activity Fit: Applicant vs. Activity Specs
export function calculateActivityFit(applicant: User, activity: Activity, applicantBudget?: number): number {
  const interestScore = jaccardSimilarity(applicant.interests, activity.interests);
  
  let budgetScore = 1.0;
  const userBudget = applicantBudget ?? applicant.budget;
  if (userBudget && activity.budget > 0) {
    const diffRatio = Math.abs(userBudget - activity.budget) / activity.budget;
    budgetScore = Math.max(0, 1 - diffRatio);
  }

  return 0.7 * interestScore + 0.3 * budgetScore;
}

//TEST BLOCK - DELETE LATER
import { mockCurrentUser, mockUsers, mockActivities } from './mockData';

console.log('--- Testing Matching Algorithm ---');

// Test applicant vs activity
const sampleActivity = mockActivities[0];
const actScore = calculateActivityFit(mockCurrentUser, sampleActivity);
console.log(`Activity Fit (${sampleActivity.destination}):`, Math.round(actScore * 100) + '%');

// Test applicant vs owner
const sampleOwner = mockUsers[sampleActivity.ownerId];
const userScore = calculateUserFit(mockCurrentUser, sampleOwner);
console.log(`User Fit with Host (${sampleOwner.name}):`, Math.round(userScore * 100) + '%');

// Combined weighted score
const finalScore = Math.round((0.6 * actScore + 0.4 * userScore) * 100);
console.log(`Composite Match Score:`, finalScore + '%');