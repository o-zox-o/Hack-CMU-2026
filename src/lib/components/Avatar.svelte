<script lang="ts">
	import { avatarSwatch } from '$lib/avatar';
	import { initials } from '$lib/format';
	import type { User } from '$lib/types';

	interface Props {
		user: User;
		size?: 'sm' | 'md' | 'lg';
	}

	let { user, size = 'md' }: Props = $props();

	/* Shared with the live map's pins, so one person is one colour everywhere. */
	let swatch = $derived(avatarSwatch(user.avatarSeed));

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
