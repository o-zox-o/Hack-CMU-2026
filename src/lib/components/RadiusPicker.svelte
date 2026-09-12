<script lang="ts">
	import { page } from '$app/state';
	import { MAX_RADIUS, RADIUS_PRESETS, radiusParam, type Radius } from '$lib/types';
	import Icon from './Icon.svelte';

	interface Props {
		/** The radius currently in effect. */
		within: Radius;
		/** True when a single campus is pinned, which overrides the radius. */
		pinned: boolean;
		/** Build a URL with some params changed; `null` removes one. */
		withParams: (changes: Record<string, string | null>) => string;
	}

	let { within, pinned, withParams }: Props = $props();

	let isPreset = $derived(within !== 'all' && RADIUS_PRESETS.includes(within as 10 | 50 | 150));
	let custom = $state('');

	/* Show the active custom distance in the box, but don't fight the user
	   while they're typing one. */
	$effect(() => {
		if (!pinned && within !== 'all' && !isPreset) custom = String(within);
	});

	const tab = 'rounded-full px-3 py-1 text-fluid-xs font-bold transition-colors';
	const on = 'bg-brand-wash text-brand-ink';
	const off = 'text-ink-muted hover:bg-surface-hover hover:text-ink';

	/* Everything except `within` and `campus` rides along with a custom submit. */
	let carried = $derived(
		[...page.url.searchParams.entries()].filter(([k]) => k !== 'within' && k !== 'campus')
	);
</script>

<nav aria-label="Distance" class="flex flex-wrap items-center gap-1">
	<Icon name="pin" size={14} class="mr-0.5 text-ink-muted" />

	{#each RADIUS_PRESETS as miles (miles)}
		{@const active = !pinned && within === miles}
		<a
			href={withParams({ within: miles === 10 ? null : String(miles), campus: null })}
			class="{tab} {active ? on : off}"
			aria-current={active ? 'page' : undefined}
		>
			{miles} mi
		</a>
	{/each}

	<a
		href={withParams({ within: 'all', campus: null })}
		class="{tab} {!pinned && within === 'all' ? on : off}"
		aria-current={!pinned && within === 'all' ? 'page' : undefined}
	>
		Anywhere
	</a>

	<!-- Custom distance. Plain GET form, so it works without JS. -->
	<form method="GET" action="/" class="flex items-center gap-1">
		{#each carried as [key, value] (key + value)}
			<input type="hidden" name={key} {value} />
		{/each}
		<label class="sr-only" for="within">Custom distance in miles</label>
		<input
			id="within"
			name="within"
			type="number"
			min="1"
			max={MAX_RADIUS}
			step="1"
			inputmode="numeric"
			placeholder="Custom"
			bind:value={custom}
			class="field h-7 w-[5.5rem] rounded-full px-3 py-0 text-fluid-xs {!pinned &&
			within !== 'all' &&
			!isPreset
				? 'border-brand bg-brand-wash font-bold text-brand-ink'
				: ''}"
		/>
		<button type="submit" class="{tab} {off}" aria-label="Apply custom distance">mi</button>
	</form>
</nav>

{#if pinned}
	<a
		href={withParams({ campus: null, within: radiusParam(within) })}
		class="text-fluid-xs font-bold text-brand-ink hover:underline"
	>
		Search by distance instead
	</a>
{/if}
