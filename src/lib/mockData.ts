// src/lib/mockData.ts
import type { User, Activity } from './matching';

export const mockCurrentUser: User = {
  id: 'usr_1',
  auth0Id: 'auth0|123',
  name: 'Alex Chen',
  email: 'alex@andrew.cmu.edu',
  university: 'Carnegie Mellon University',
  gender: 'Non-binary',
  interests: ['food', 'board games', 'museums', 'hiking'],
  age: 19,
  location: 15213,
  budget: 50
};

export const mockUsers: Record<string, User> = {
  usr_1: mockCurrentUser,
  usr_2: {
    id: 'usr_2',
    auth0Id: 'auth0|456',
    name: 'Maya Patel',
    email: 'maya@pitt.edu',
    university: 'University of Pittsburgh',
    gender: 'Female',
    interests: ['food', 'museums', 'photography'],
    age: 20,
    location: 15213,
    budget: 45
  },
  usr_3: {
    id: 'usr_3',
    auth0Id: 'auth0|789',
    name: 'Liam Vance',
    email: 'liam@andrew.cmu.edu',
    university: 'Carnegie Mellon University',
    gender: 'Male',
    interests: ['nightlife', 'clubbing', 'shopping'],
    age: 23,
    location: 15213,
    budget: 150
  }
};

export const mockActivities: Activity[] = [
  {
    id: 'act_1',
    ownerId: 'usr_2',
    destination: 'Strip District Food Tour',
    description: 'Hitting up bakeries, Italian markets, and noodle bars on Saturday morning!',
    startDate: '2026-09-12T10:00:00Z',
    endDate: '2026-09-12T14:00:00Z',
    budget: 40,
    interests: ['food', 'baking', 'walking']
  },
  {
    id: 'act_2',
    ownerId: 'usr_3',
    destination: 'South Side Bar Crawl',
    description: 'Late night club hopping and rooftop drinks.',
    startDate: '2026-09-12T22:00:00Z',
    endDate: '2026-09-13T02:00:00Z',
    budget: 120,
    interests: ['nightlife', 'dancing']
  }
];