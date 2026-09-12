<script lang="ts">
	import ActivityCard from '$lib/components/ActivityCard.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { data } = $props();

	/* Yours to confirm: they have started, and you're the host. Until you mark
	   them complete nobody who came gets grass for them. */
	let toConfirm = $derived(data.past.filter((a) => a.isHost && a.awaitingCompletion));

	const TABS = [
		{ id: 'all', label: 'All' },
		{ id: 'hosting', label: 'Hosting' },
		{ id: 'joined', label: 'Joined' }
	] as const;

	const tab = 'rounded-full px-3 py-1 text-fluid-xs font-bold transition-colors';
	const on = 'bg-brand-wash text-brand-ink';
	const off = 'text-ink-muted hover:bg-surface-hover hover:text-ink';
</script>

<svelte:head>
	<title>My activities · Tagalong</title>
</svelte:head>

<div class="flex flex-col gap-3">
	<div class="leaf-card px-4 py-3">
		<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
			<div class="min-w-0">
				<h1 class="text-fluid-xl font-extrabold text-ink">My activities</h1>
				<p class="text-fluid-xs text-ink-muted">
					{data.upcoming.length} coming up · {data.past.length} past
				</p>
			</div>
			<nav aria-label="Filter" class="ml-auto flex gap-1">
				{#each TABS as t (t.id)}
					{@const active = data.filter === t.id}
					<a
						href={t.id === 'all' ? '/my-activities' : `/my-activities?filter=${t.id}`}
						class="{tab} {active ? on : off}"
						aria-current={active ? 'page' : undefined}
					>
						{t.label}
						<span class="opacity-60">{data.counts[t.id]}</span>
					</a>
				{/each}
			</nav>
		</div>
	</div>

	{#if data.upcoming.length === 0 && data.past.length === 0}
		<div class="leaf-card flex flex-col items-center gap-3 px-6 py-12 text-center">
			<Icon name="sprout" size={36} class="text-brand-ink" />
			<h2 class="text-fluid-lg font-extrabold text-ink">Nothing here yet</h2>
			<p class="max-w-sm text-fluid-sm text-ink-soft">
				{#if data.filter === 'hosting'}
					You haven't posted anything yet.
				{:else if data.filter === 'joined'}
					You haven't joined anything yet.
				{:else}
					Join something from the feed, or post your own. It'll show up here.
				{/if}
			</p>
			<div class="mt-1 flex gap-2">
				<a href="/" class="btn btn-ghost">Browse the feed</a>
				<a href="/activities/new" class="btn btn-primary">
					<Icon name="plus" size={14} strokeWidth={3} /> Post an activity
				</a>
			</div>
		</div>
	{/if}

	{#if data.upcoming.length > 0}
		<section class="flex flex-col gap-3">
			<h2 class="px-1 text-fluid-xs font-extrabold tracking-wider text-ink-muted uppercase">
				Coming up
			</h2>
			<ul class="flex flex-col gap-3">
				{#each data.upcoming as activity (activity.id)}
					<li><ActivityCard {activity} /></li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.past.length > 0}
		<section class="flex flex-col gap-3">
			<h2 class="px-1 text-fluid-xs font-extrabold tracking-wider text-ink-muted uppercase">
				Past
			</h2>
			{#if toConfirm.length > 0}
				<p class="rounded-lg bg-brand-wash px-3 py-2 text-fluid-xs text-ink-soft">
					<span class="font-extrabold text-ink">
						{toConfirm.length}
						{toConfirm.length === 1 ? 'activity is' : 'activities are'} waiting on you.
					</span>
					Open
					{#each toConfirm.slice(0, 3) as a, i (a.id)}
						{#if i > 0},{/if}
						<a href="/activities/{a.id}" class="font-bold text-brand-ink hover:underline"
							>{a.title}</a
						>
					{/each}
					{#if toConfirm.length > 3}and {toConfirm.length - 3} more{/if}
					to confirm {toConfirm.length === 1 ? 'it' : 'they'} happened. Nobody gets grass until you do.
				</p>
			{/if}
			<ul class="flex flex-col gap-3 opacity-65">
				{#each data.past as activity (activity.id)}
					<li><ActivityCard {activity} /></li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
