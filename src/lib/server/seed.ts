/**
 * Demo data. Both backends load this: the in-memory store on every boot, the
 * Mongo store once, when the `users` collection is empty.
 *
 * Every seeded account signs in with DEMO_PASSWORD. Times are relative to
 * "now" so nothing is ever in the past on first load.
 */

import type { Activity, Comment, UserDoc } from '$lib/types';
import { hashPassword } from './auth';

/** Bump whenever you edit the data below so a running dev server re-seeds. */
export const SEED_VERSION = 5;

export interface SeedData {
	users: UserDoc[];
	activities: Activity[];
	comments: Comment[];
}

/** Password for every seeded account — shown on the login page in dev. */
export const DEMO_PASSWORD = 'tagalong';

/** Minutes/hours/days from "now", so seed data never goes stale. */
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
const hoursAgo = (h: number) => hoursFromNow(-h);

export function seedData(): SeedData {
	/** Every seeded account signs in with this password. */
	const demoHash = hashPassword(DEMO_PASSWORD);

	const users: UserDoc[] = [
		{
			id: 'u_mei',
			name: 'Mei Tanaka',
			handle: 'mei',
			campus: 'cmu',
			bio: 'Junior in ECE. Perpetually organizing the Costco run.',
			avatarSeed: 0,
			email: 'mei@andrew.cmu.edu',
			passwordHash: demoHash,
			joinedAt: hoursAgo(24 * 240)
		},
		{
			id: 'u_satsuki',
			name: 'Satsuki Kusakabe',
			handle: 'satsuki',
			campus: 'cmu',
			bio: 'Design major. Will absolutely split your Spotify.',
			avatarSeed: 1,
			email: 'satsuki@andrew.cmu.edu',
			passwordHash: demoHash,
			joinedAt: hoursAgo(24 * 190)
		},
		{
			id: 'u_kanta',
			name: 'Kanta Ogaki',
			handle: 'kanta',
			campus: 'pitt',
			bio: 'Bio pre-med, lives in Oakland, has a car.',
			avatarSeed: 2,
			email: 'kanta@pitt.edu',
			passwordHash: demoHash,
			joinedAt: hoursAgo(24 * 150)
		},
		{
			id: 'u_nori',
			name: 'Nori Alvarez',
			handle: 'nori',
			campus: 'cmu',
			bio: 'CS + stats. Optimizing my grocery budget like a DP problem.',
			avatarSeed: 3,
			email: 'nori@andrew.cmu.edu',
			passwordHash: demoHash,
			joinedAt: hoursAgo(24 * 95)
		},
		{
			id: 'u_pria',
			name: 'Pria Raghunathan',
			handle: 'pria',
			campus: 'chatham',
			bio: 'Env science. Carpool evangelist.',
			avatarSeed: 4,
			email: 'pria@chatham.edu',
			passwordHash: demoHash,
			joinedAt: hoursAgo(24 * 70)
		},
		{
			id: 'u_dev',
			name: 'Dev Okonkwo',
			handle: 'dev',
			campus: 'duquesne',
			bio: 'Business. Always three people short of a delivery minimum.',
			avatarSeed: 5,
			email: 'dev@duq.edu',
			passwordHash: demoHash,
			joinedAt: hoursAgo(24 * 40)
		},
		{
			id: 'u_lin',
			name: 'Lin Zhou',
			handle: 'lin',
			campus: 'pitt',
			bio: 'Materials sci. IKEA trip enthusiast.',
			avatarSeed: 6,
			email: 'lin@pitt.edu',
			passwordHash: demoHash,
			joinedAt: hoursAgo(24 * 30)
		},
		{
			id: 'u_theo',
			name: 'Theo Marsh',
			handle: 'theo',
			campus: 'cmu',
			bio: 'Drama. Needs a ride to the airport roughly always.',
			avatarSeed: 7,
			email: 'theo@andrew.cmu.edu',
			passwordHash: demoHash,
			joinedAt: hoursAgo(24 * 12)
		},
		{
			id: 'u_ava',
			name: 'Ava Lindqvist',
			handle: 'ava',
			campus: 'psu',
			bio: 'Penn State. Drives to Pittsburgh most weekends.',
			avatarSeed: 0,
			email: 'ava@psu.edu',
			passwordHash: demoHash,
			joinedAt: hoursAgo(24 * 20)
		},
		{
			id: 'u_marcus',
			name: 'Marcus Bell',
			handle: 'marcus',
			campus: 'wvu',
			bio: 'WVU. Bulk-buys everything.',
			avatarSeed: 5,
			email: 'marcus@mix.wvu.edu',
			passwordHash: demoHash,
			joinedAt: hoursAgo(24 * 9)
		}
	];

	const activities: Activity[] = [
		{
			id: 'a_spotify',
			title: 'Spotify Duo — 1 slot left, $6/mo',
			body: "Family plan, 4 of us on it already. Need one more to bring everyone's share down. Venmo monthly, I'll add you the same day. Must be able to set your address to Pittsburgh.",
			category: 'subscriptions',
			campus: 'cmu',
			hostId: 'u_satsuki',
			location: 'Online — Venmo @satsuki',
			startsAt: hoursFromNow(48),
			spots: 6,
			memberIds: ['u_satsuki', 'u_nori', 'u_mei', 'u_theo', 'u_lin'],
			costCents: 600,
			costBasis: 'per-person',
			createdAt: hoursAgo(5)
		},
		{
			id: 'a_costco',
			title: 'Costco run Saturday — I drive, we split gas + membership',
			body: 'Heading out ~10am Saturday, back by 1. Room for 3. Split is gas ($12ish) plus $5 each toward my membership. Bring your own bags, we are not paying for boxes again.',
			category: 'groceries',
			campus: 'cmu',
			hostId: 'u_mei',
			location: "Morewood Ave lot (meet by Tepper's doors)",
			startsAt: hoursFromNow(31),
			spots: 4,
			memberIds: ['u_mei', 'u_nori'],
			costCents: 1700,
			costBasis: 'per-person',
			createdAt: hoursAgo(9)
		},
		{
			id: 'a_airport',
			title: 'PIT airport Uber — Friday 6am, splitting 4 ways',
			body: "Flight is at 8:40 so I'm leaving at 6 sharp. UberXL from Oakland is about $52, which is $13 each if we fill it. I'll book and you Venmo me at the curb.",
			category: 'rides',
			campus: 'pitt',
			hostId: 'u_kanta',
			location: 'Forbes & Bouquet',
			startsAt: hoursFromNow(80),
			spots: 4,
			memberIds: ['u_kanta', 'u_theo', 'u_pria'],
			costCents: 5200,
			costBasis: 'total',
			createdAt: hoursAgo(14)
		},
		{
			id: 'a_ikea',
			title: 'IKEA Robinson haul — need 2 more for the car',
			body: "Getting a desk and a shelf, there's room for two people and their flat-packs. Leaving Sunday noon. Gas split only, no charge for the trunk space.",
			category: 'supplies',
			campus: 'pitt',
			hostId: 'u_lin',
			location: 'Sutherland Hall circle',
			startsAt: hoursFromNow(60),
			spots: 3,
			memberIds: ['u_lin'],
			costCents: 900,
			costBasis: 'per-person',
			createdAt: hoursAgo(20)
		},
		{
			id: 'a_ramen',
			title: 'Hitting the $35 delivery minimum at Ramen Bar',
			body: 'Ordering in ~40 min. I need about $12 more on the ticket to clear the minimum and kill the small-order fee. Drop what you want in the comments, meet in the Donner lounge.',
			category: 'food',
			campus: 'cmu',
			hostId: 'u_theo',
			location: 'Donner House lounge',
			startsAt: hoursFromNow(1),
			spots: 5,
			memberIds: ['u_theo', 'u_satsuki'],
			costCents: 3500,
			costBasis: 'total',
			createdAt: hoursAgo(1)
		},
		{
			id: 'a_giant_eagle',
			title: 'Weekly Giant Eagle walk — produce split',
			body: 'Every Tuesday. We buy the big bags of produce and divide them up on the walk back. Way cheaper than buying singles and nothing rots before you eat it.',
			category: 'groceries',
			campus: 'cmu',
			hostId: 'u_nori',
			location: 'Giant Eagle, Shadyside',
			startsAt: hoursFromNow(26),
			spots: 6,
			memberIds: ['u_nori', 'u_mei', 'u_satsuki', 'u_theo'],
			costCents: 0,
			costBasis: 'per-person',
			createdAt: hoursAgo(30)
		},
		{
			id: 'a_nyt',
			title: 'NYT + Games group sub, $2.50 each',
			body: 'Have 3 of 5 seats filled on the group subscription. Includes Cooking and Games. Annual, so it is one Venmo and then you forget about it.',
			category: 'subscriptions',
			campus: 'duquesne',
			hostId: 'u_dev',
			location: 'Online',
			startsAt: hoursFromNow(120),
			spots: 5,
			memberIds: ['u_dev', 'u_kanta', 'u_pria'],
			costCents: 250,
			costBasis: 'per-person',
			createdAt: hoursAgo(36)
		},
		{
			id: 'a_laundry',
			title: 'Laundromat carpool + detergent bulk split',
			body: 'The machines in my building eat quarters. Driving to the laundromat on Murray, and a Costco-size detergent split four ways is roughly nothing per load.',
			category: 'errands',
			campus: 'chatham',
			hostId: 'u_pria',
			location: 'Murray Ave laundromat',
			startsAt: hoursFromNow(52),
			spots: 4,
			memberIds: ['u_pria', 'u_dev'],
			costCents: 800,
			costBasis: 'per-person',
			createdAt: hoursAgo(44)
		},
		{
			id: 'a_textbook',
			title: 'Splitting the 21-241 textbook rental',
			body: 'Rental is $60 for the semester. Two of us can share — I need it Mon/Wed, you take it Tue/Thu/weekend. Has worked fine for me twice now.',
			category: 'supplies',
			campus: 'cmu',
			hostId: 'u_nori',
			location: 'Hunt Library, 2nd floor',
			startsAt: hoursFromNow(18),
			spots: 2,
			memberIds: ['u_nori', 'u_mei'],
			costCents: 6000,
			costBasis: 'total',
			createdAt: hoursAgo(52)
		},
		{
			id: 'a_farmers',
			title: 'Squirrel Hill farmers market — bulk eggs & bread',
			body: 'The stands do way better prices by the dozen/loaf if you buy a lot. Four of us clears the bulk tier easily. Sunday morning, walkable from campus.',
			category: 'groceries',
			campus: 'cmu',
			hostId: 'u_satsuki',
			location: 'Beacon St lot, Squirrel Hill',
			startsAt: hoursFromNow(70),
			spots: 5,
			memberIds: ['u_satsuki', 'u_lin', 'u_nori'],
			costCents: 1200,
			costBasis: 'per-person',
			createdAt: hoursAgo(66)
		},
		{
			id: 'a_free_pizza',
			title: 'Free pizza — leftovers from the SCS town hall',
			body: 'Six untouched boxes in the Gates 6th floor kitchen. First come first served. Bring a container if you want to take slices back.',
			category: 'food',
			campus: 'cmu',
			hostId: 'u_theo',
			location: 'Gates 6th floor kitchen',
			startsAt: hoursFromNow(2),
			spots: 12,
			memberIds: ['u_theo', 'u_satsuki', 'u_nori'],
			costCents: 0,
			costBasis: 'per-person',
			createdAt: hoursAgo(0.5)
		},
		{
			id: 'a_free_couch',
			title: 'Free couch + two lamps, moving out Sunday',
			body: "Grey IKEA loveseat, no stains, and two floor lamps. You haul, you keep. I'm on the 2nd floor with no elevator, so bring a friend.",
			category: 'supplies',
			campus: 'pitt',
			hostId: 'u_lin',
			location: 'Atwood St, Oakland',
			startsAt: hoursFromNow(58),
			spots: 2,
			memberIds: ['u_lin'],
			costCents: 0,
			costBasis: 'per-person',
			createdAt: hoursAgo(3)
		},
		{
			id: 'a_psu_ride',
			title: 'State College → Pittsburgh, Friday 4pm, 2 seats',
			body: 'Driving down for the weekend, coming back Sunday night. Split gas both ways, about $15 each way. Pickup by the HUB.',
			category: 'rides',
			campus: 'psu',
			hostId: 'u_ava',
			location: 'HUB-Robeson Center, University Park',
			startsAt: hoursFromNow(90),
			spots: 3,
			memberIds: ['u_ava'],
			costCents: 3000,
			costBasis: 'per-person',
			createdAt: hoursAgo(6)
		},
		{
			id: 'a_wvu_sams',
			title: "Sam's Club run Sunday — Morgantown",
			body: 'I have the membership and a truck. Three seats, split gas, bring your list. Back by 3.',
			category: 'groceries',
			campus: 'wvu',
			hostId: 'u_marcus',
			location: 'Mountainlair front steps',
			startsAt: hoursFromNow(55),
			spots: 4,
			memberIds: ['u_marcus'],
			costCents: 600,
			costBasis: 'per-person',
			createdAt: hoursAgo(12)
		}
	];

	const comments: Comment[] = [
		{
			id: 'c_1',
			activityId: 'a_costco',
			authorId: 'u_theo',
			body: 'Is there room for a case of seltzer or are we tight on trunk space?',
			createdAt: hoursAgo(7)
		},
		{
			id: 'c_2',
			activityId: 'a_costco',
			authorId: 'u_mei',
			body: 'Trunk is fine, back seat is the tight part. Seltzer is welcome.',
			createdAt: hoursAgo(6)
		},
		{
			id: 'c_3',
			activityId: 'a_spotify',
			authorId: 'u_nori',
			body: 'Can confirm, been on this plan since March and it has never broken.',
			createdAt: hoursAgo(4)
		},
		{
			id: 'c_4',
			activityId: 'a_airport',
			authorId: 'u_pria',
			body: 'In. I only have a carry-on so the trunk is all yours.',
			createdAt: hoursAgo(11)
		},
		{
			id: 'c_5',
			activityId: 'a_ramen',
			authorId: 'u_satsuki',
			body: 'Spicy miso + gyoza for me, sending $14 now.',
			createdAt: hoursAgo(1)
		}
	];

	return { users, activities, comments };
}
