<script lang="ts">
	import { theme, type Theme } from '$lib/theme.svelte';
	import Icon, { type IconName } from './Icon.svelte';

	const LOOK: Record<Theme, { icon: IconName; label: string }> = {
		light: { icon: 'sun', label: 'Light' },
		dark: { icon: 'moon', label: 'Dark' },
		system: { icon: 'monitor', label: 'System' }
	};

	let look = $derived(LOOK[theme.current]);
</script>

<button
	type="button"
	class="rounded-full p-2 text-ink-soft transition-colors hover:bg-surface-hover hover:text-ink"
	onclick={() => theme.cycle()}
	title="Theme: {look.label} — click to change"
	aria-label="Theme: {look.label}. Click to change."
>
	<Icon name={look.icon} size={18} />
</button>
