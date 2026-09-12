// src/lib/mockData.ts
import type { User, Activity } from './types';

export const mockCurrentUser: User = {
  id: 'usr_1',
  auth0Id: 'auth0|123',
  name: 'Alex Chen',
  email: 'alex@andrew.cmu.edu',
  university: 'Carnegie Mellon University',
  age: 19,
  gender: 'Non-binary',
  interests: ['food', 'board games', 'museums', 'hiking'],
  location: 'Pittsburgh, PA'
};

export const mockUsers: Record<string, User> = {
  usr_1: mockCurrentUser,
  usr_2: {
    id: 'usr_2',
    auth0Id: 'auth0|456',
    name: 'Maya Patel',
    email: 'maya@pitt.edu',
    university: 'University of Pittsburgh',
    age: 20,
    gender: 'Female',
    interests: ['food', 'museums', 'photography'],
    location: 'Pittsburgh, PA'
  }
};

export const mockActivities: Activity[] = [
  {
    id: 'act_1',
    creatorId: 'usr_2',
    memberIds: ['usr_2'],
    title: 'Strip District Food Tour',
    description: 'Hitting up bakeries and noodle bars on Saturday morning!',
    location: 'Strip District',
    startDate: '2026-09-12T10:00:00Z',
    endDate: '2026-09-12T14:00:00Z',
    budget: 40,
    interests: ['food', 'baking', 'walking'],
    maxMembers: 4,
    preferredGender: 'any',
    minAge: 18,
    maxAge: 25
  }
];