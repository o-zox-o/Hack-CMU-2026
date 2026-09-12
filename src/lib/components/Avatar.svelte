<script lang="ts">
	import { initials } from '$lib/format';
	import type { User } from '$lib/types';

	interface Props {
		user: User;
		size?: 'sm' | 'md' | 'lg';
	}

	let { user, size = 'md' }: Props = $props();

	/* Warm palette — stable per user via `avatarSeed`. */
	const PALETTE = [
		{ bg: '#46a53c', fg: '#ffffff' }, // clover
		{ bg: '#1a1a1a', fg: '#ffffff' }, // ink
		{ bg: '#fbdce4', fg: '#7a1f3d' }, // blush
		{ bg: '#d9d4c9', fg: '#1a1a1a' }, // putty
		{ bg: '#7fa8c2', fg: '#0f1b22' }, // sky
		{ bg: '#c9584a', fg: '#ffffff' }, // berry
		{ bg: '#2b6a27', fg: '#ffffff' }, // deep clover
		{ bg: '#a8886a', fg: '#ffffff' } // acorn
	];

	let swatch = $derived(
		PALETTE[(user.avatarSeed ?? 0) % PALETTE.length] ?? PALETTE[0]
	);

	const SIZES = {
		sm: 'h-6 w-6 text-[0.6rem]',
		md: 'h-8 w-8 text-[0.7rem]',
		lg: 'h-12 w-12 text-sm'
	};
</script>

<span
	class="inline-flex shrink-0 items-center justify-center rounded-full font-extrabold select-none {SIZES[
		size
	]}"
	style="background-color: {swatch.bg}; color: {swatch.fg}"
	title={user.name}
	aria-hidden="true"
>
	{initials(user.name)}
</span>
