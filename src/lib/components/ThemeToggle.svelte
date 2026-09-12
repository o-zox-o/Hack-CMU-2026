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
	class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-hedge-strong px-2.5 py-1.5 text-ink transition-colors hover:border-brand hover:bg-brand-wash hover:text-brand-ink"
	onclick={() => theme.cycle()}
	title="Theme: {look.label} — click to change"
	aria-label="Theme: {look.label}. Click to change."
>
	<Icon name={look.icon} size={17} />
	<span class="hidden text-fluid-xs font-bold sm:inline">{look.label}</span>
</button>
