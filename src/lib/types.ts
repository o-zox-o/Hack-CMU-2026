export type User = {
  id: string;
  auth0Id: string;

  name: string;
  email: string;
  university: string;
  age: number;
  gender: string;

  interests: string[];
  location: string;
};

export type Activity = {
  id: string;

  creatorId: string;
  memberIds: string[];

  title: string;
  description: string;

  location: string;
  startDate: string;
  endDate?: string;

  budget: number;
  interests: string[];

  maxMembers: number;

  preferredGender?: string;
  minAge?: number;
  maxAge?: number;
};