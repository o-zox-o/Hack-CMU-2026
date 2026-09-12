<script lang="ts">
	import { page } from '$app/state';
	import ActivityCard from '$lib/components/ActivityCard.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { radiusMiles } from '$lib/geo';
	import RadiusPicker from '$lib/components/RadiusPicker.svelte';
	import { campusMeta, categoryMeta, DEFAULT_RADIUS, SORTS } from '$lib/types';

	let { data } = $props();

	let heading = $derived.by(() => {
		if (data.query.q) return `Results for “${data.query.q}”`;
		if (data.query.category) return categoryMeta(data.query.category).label;
		if (data.query.campus) return campusMeta(data.query.campus).label;
		return data.query.sort === 'foryou' ? 'For you' : 'Near you';
	});

	/* Where we're looking: one campus, a radius around you, or everywhere. */
	let scope = $derived.by(() => {
		if (data.query.campus) return `${campusMeta(data.query.campus).city} · one campus`;
		const limit = radiusMiles(data.query.within ?? DEFAULT_RADIUS);
		if (limit === null) return 'every campus';
		const count = data.campuses.filter((c) => c.miles <= limit).length;
		const anchor = data.locationSource === 'gps' ? 'you' : data.campuses[0].short;
		return `within ${limit} mi of ${anchor} · ${count} ${count === 1 ? 'campus' : 'campuses'}`;
	});

	let hasFilter = $derived(
		Boolean(
			data.query.q ||
			data.query.category ||
			data.query.free ||
			page.url.searchParams.has('campus') ||
			page.url.searchParams.has('within')
		)
	);

	/** Same URL with some params changed; `null` removes one. Keeps everything else. */
	function withParams(changes: Record<string, string | null>): string {
		const params = new URLSearchParams(page.url.searchParams);
		for (const [key, value] of Object.entries(changes)) {
			if (value === null) params.delete(key);
			else params.set(key, value);
		}
		const qs = params.toString();
		return qs ? `/?${qs}` : '/';
	}

	const tab = 'rounded-full px-3 py-1 text-fluid-xs font-bold transition-colors';
	const tabOn = 'bg-brand-wash text-brand-ink';
	const tabOff = 'text-ink-muted hover:bg-surface-hover hover:text-ink';
</script>

<svelte:head>
	<title>{heading} · Tagalong</title>
</svelte:head>

<div class="flex flex-col gap-3">
	<div class="leaf-card px-4 py-3">
		<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
			<div class="min-w-0">
				<h1 class="text-fluid-xl font-extrabold text-ink">{heading}</h1>
				<p class="text-fluid-xs text-ink-muted">{scope}</p>
			</div>
			{#if hasFilter}
				<a
					href="/"
					class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-fluid-xs font-bold text-ink-muted hover:bg-surface-hover hover:text-ink"
				>
					<Icon name="close" size={12} strokeWidth={3} /> Clear
				</a>
			{/if}

			<nav aria-label="Sort" class="ml-auto flex gap-1">
				{#each SORTS as sort (sort.id)}
					{@const isActive = data.query.sort === sort.id}
					<a
						href={withParams({ sort: sort.id })}
						class="{tab} {isActive ? tabOn : tabOff}"
						aria-current={isActive ? 'page' : undefined}
					>
						{sort.label}
					</a>
				{/each}
			</nav>
		</div>

		<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hedge pt-3">
			<RadiusPicker
				within={data.query.within ?? DEFAULT_RADIUS}
				pinned={Boolean(data.query.campus)}
				{withParams}
			/>

			<!-- All / Free -->
			<nav aria-label="Price" class="flex gap-1 sm:ml-auto">
				<a
					href={withParams({ free: null })}
					class="{tab} {!data.query.free ? tabOn : tabOff}"
					aria-current={!data.query.free ? 'page' : undefined}
				>
					All
				</a>
				<a
					href={withParams({ free: '1' })}
					class="{tab} inline-flex items-center gap-1 {data.query.free ? tabOn : tabOff}"
					aria-current={data.query.free ? 'page' : undefined}
				>
					<Icon name="gift" size={13} /> Free
				</a>
			</nav>
		</div>
	</div>

	{#if data.activities.length === 0}
		<div class="leaf-card flex flex-col items-center gap-3 px-6 py-12 text-center">
			<Icon name="sprout" size={36} class="text-brand-ink" />
			<h2 class="text-fluid-lg font-extrabold text-ink">Nothing here yet</h2>
			<p class="max-w-sm text-fluid-sm text-ink-soft">
				{#if !data.query.campus && data.query.within !== 'all'}
					Nothing posted {scope}.
					<a
						href={withParams({ within: 'all', campus: null })}
						class="font-bold text-brand-ink hover:underline">Widen the search</a
					> — or be the first to post one.
				{:else if hasFilter}
					No activities match this filter. Try clearing it — or be the first to post one.
				{:else}
					Be the first to post something people can tag along to.
				{/if}
			</p>
			<a href="/activities/new" class="btn btn-primary mt-1">
				<Icon name="plus" size={14} strokeWidth={3} /> Post an activity
			</a>
		</div>
	{:else}
		<ul class="flex flex-col gap-3">
			{#each data.activities as activity (activity.id)}
				<li><ActivityCard {activity} /></li>
			{/each}
		</ul>
	{/if}
</div>
