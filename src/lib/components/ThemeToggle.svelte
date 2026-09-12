<script lang="ts">
	import { theme, type Theme } from '$lib/theme.svelte';
	import Icon, { type IconName } from './Icon.svelte';

	const LOOK: { id: Theme; icon: IconName; label: string }[] = [
		{ id: 'light', icon: 'sun', label: 'Light' },
		{ id: 'dark', icon: 'moon', label: 'Dark' },
		{ id: 'system', icon: 'monitor', label: 'System' }
	];

	let current = $derived(LOOK.find((l) => l.id === theme.current) ?? LOOK[2]);
</script>

<!--
	All three icons are rendered and hidden with CSS rather than swapping one
	slot. The server can't read localStorage, so it always guesses "System";
	if this were a single dynamic icon, hydration would patch the real theme's
	attributes onto the guess's element tags — a moon path inside a <rect> —
	and Svelte can't key its way out of that, because hydration claims whatever
	markup arrived. Identical markup on both sides means nothing to reconcile.
-->
<button
	type="button"
	class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-hedge-strong px-2.5 py-1.5 text-ink transition-colors hover:border-brand hover:bg-brand-wash hover:text-brand-ink"
	onclick={() => theme.cycle()}
	title="Theme: {current.label}, click to change"
	aria-label="Theme: {current.label}. Click to change."
>
	{#each LOOK as look (look.id)}
		<span class="contents" hidden={look.id !== current.id}>
			<Icon name={look.icon} size={17} />
			<span class="hidden text-fluid-xs font-bold sm:inline">{look.label}</span>
		</span>
	{/each}
</button>
