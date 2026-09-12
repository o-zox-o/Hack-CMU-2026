import { CAMPUSES, campusMeta, type CampusId, type LatLng, type Radius } from './types';

/** Great-circle distance in miles. Plenty accurate for "which campuses are near me". */
export function haversineMiles(a: LatLng, b: LatLng): number {
	const R = 3958.8;
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(h));
}

export function campusLocation(id: CampusId): LatLng {
	const c = campusMeta(id);
	return { lat: c.lat, lng: c.lng };
}

export function distanceToCampus(from: LatLng, campus: CampusId): number {
	return haversineMiles(from, campusLocation(campus));
}

/** Every campus with its distance from `from`, nearest first. */
export function campusesByDistance(from: LatLng) {
	return CAMPUSES.map((c) => ({
		...c,
		miles: haversineMiles(from, { lat: c.lat, lng: c.lng })
	})).sort((a, b) => a.miles - b.miles);
}

/** Miles for a radius, or null when it is unlimited. */
export function radiusMiles(radius: Radius): number | null {
	return radius === 'all' ? null : radius;
}

/** Campus ids within `radius` of `from` (all of them when the radius is unlimited). */
export function campusesWithin(from: LatLng, radius: Radius): CampusId[] {
	const limit = radiusMiles(radius);
	return campusesByDistance(from)
		.filter((c) => limit === null || c.miles <= limit)
		.map((c) => c.id);
}

/** The `loc` cookie is "lat,lng" written by the browser. Anything else -> null. */
export function parseLatLng(raw: string | null | undefined): LatLng | null {
	if (!raw) return null;
	const [lat, lng] = raw.split(',').map(Number);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
	if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
	return { lat, lng };
}

export const LOCATION_COOKIE = 'loc';
