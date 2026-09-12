/**
 * The colour someone is, everywhere they appear.
 *
 * Shared rather than living inside Avatar.svelte because the live map draws
 * its pins as raw HTML strings (Leaflet builds markers that way, so they can't
 * be components). A pin only helps you find someone if it is the same colour
 * as the avatar next to their name in the list, so both read from here.
 */

export interface Swatch {
	bg: string;
	fg: string;
}

/* Warm palette, stable per user via `avatarSeed`. */
export const AVATAR_PALETTE: Swatch[] = [
	{ bg: '#46a53c', fg: '#ffffff' }, // clover
	{ bg: '#1a1a1a', fg: '#ffffff' }, // ink
	{ bg: '#fbdce4', fg: '#7a1f3d' }, // blush
	{ bg: '#d9d4c9', fg: '#1a1a1a' }, // putty
	{ bg: '#7fa8c2', fg: '#0f1b22' }, // sky
	{ bg: '#c9584a', fg: '#ffffff' }, // berry
	{ bg: '#2b6a27', fg: '#ffffff' }, // deep clover
	{ bg: '#a8886a', fg: '#ffffff' } // acorn
];

export function avatarSwatch(avatarSeed: number | undefined): Swatch {
	return AVATAR_PALETTE[(avatarSeed ?? 0) % AVATAR_PALETTE.length] ?? AVATAR_PALETTE[0];
}
