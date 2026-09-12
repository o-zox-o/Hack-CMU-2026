<script lang="ts">
	import ActivityCard from '$lib/components/ActivityCard.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Garden from '$lib/components/Garden.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import { earnedBadges } from '$lib/grass';
	import { campusMeta, isStudent } from '$lib/types';

	let { data } = $props();

	let user = $derived(data.profile);
	let joinedYear = $derived(new Date(user.joinedAt).getFullYear());
	let badges = $derived(earnedBadges({ stats: data.stats, isTopToucher: data.isTopToucher }));
	let student = $derived(isStudent(user));
</script>

<svelte:head>
	<title>{user.name} · Tagalong</title>
</svelte:head>

<div class="flex flex-col gap-3">
	<a
		href="/"
		class="inline-flex items-center gap-1 text-fluid-xs font-bold text-ink-muted hover:text-ink"
	>
		<Icon name="arrowUp" size={14} class="-rotate-90" /> Back to feed
	</a>

	<!-- Header -->
	<section class="leaf-card overflow-hidden">
		<div class="h-16 w-full bg-clover-500 sm:h-20"></div>
		<div class="px-4 pb-4 sm:px-5">
			<div class="-mt-6 flex items-start gap-3">
				<span class="rounded-full ring-4 ring-surface">
					<Avatar {user} size="lg" />
				</span>
				<div class="min-w-0 pt-7">
					<h1 class="truncate text-fluid-xl font-extrabold text-ink">{user.name}</h1>
					<p class="flex flex-wrap items-center gap-x-1.5 text-fluid-xs text-ink-muted">
						<span>@{user.handle}</span>
						<span aria-hidden="true">·</span>
						<span>{campusMeta(user.campus).label}</span>
						<span aria-hidden="true">·</span>
						<span>since {joinedYear}</span>
						{#if student}
							<span
								class="inline-flex items-center gap-1 rounded-full bg-brand-wash px-2 py-0.5 font-bold text-brand-ink"
								title="Verified .edu address"
							>
								<Icon name="sprout" size={11} /> Student
							</span>
						{/if}
					</p>
				</div>
			</div>

			{#if user.bio}
				<p class="mt-3 text-fluid-sm text-ink-soft">{user.bio}</p>
			{/if}

			{#if user.interests.length > 0}
				<ul class="mt-3 flex flex-wrap gap-1.5">
					{#each user.interests as interest (interest)}
						<li
							class="rounded-full bg-surface-sunk px-2.5 py-1 text-fluid-xs font-bold text-ink-soft"
						>
							{interest}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>

	{#if data.standing.warned}
		<div class="rounded-card border border-berry-500 bg-berry-500/10 px-4 py-2.5">
			<p class="flex items-center gap-1.5 text-fluid-sm font-extrabold text-berry-500">
				<Icon name="close" size={15} strokeWidth={3} /> This host has a warning
			</p>
			<p class="mt-0.5 text-fluid-xs text-ink-soft">
				{data.standing.poorlyRated} of their activities were rated poorly by the people who went.
			</p>
		</div>
	{:else if data.standing.average !== null}
		<div class="leaf-card flex flex-wrap items-baseline gap-x-2 px-4 py-2.5">
			<span class="text-fluid-xs font-extrabold tracking-wider text-ink-muted uppercase">
				As a host
			</span>
			<span class="text-fluid-sm font-extrabold text-ink">{data.standing.average} / 5</span>
			<span class="text-fluid-xs text-ink-muted">
				across {data.standing.ratedActivities}
				{data.standing.ratedActivities === 1 ? 'rated activity' : 'rated activities'}
			</span>
		</div>
	{/if}

	<!-- Grass -->
	<section class="leaf-card p-4 sm:p-5">
		<div class="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
			<div>
				<h2 class="text-fluid-xs font-extrabold tracking-wider text-ink-muted uppercase">
					Grass touched
				</h2>
				<p class="mt-0.5 flex items-baseline gap-1.5">
					<span class="text-fluid-2xl font-extrabold text-brand-ink">{data.stats.score}</span>
					<span class="text-fluid-sm text-ink-soft">
						{data.stats.score === 1 ? 'activity' : 'activities'}
					</span>
				</p>
			</div>
			<dl class="flex gap-4 text-fluid-xs">
				<div>
					<dd class="font-extrabold text-ink">{data.stats.hosted}</dd>
					<dt class="text-ink-muted">hosted</dt>
				</div>
				<div>
					<dd class="font-extrabold text-ink">{data.stats.joined}</dd>
					<dt class="text-ink-muted">joined</dt>
				</div>
			</dl>
		</div>

		<div class="mt-3">
			<Garden score={data.stats.score} seed={user.id} />
		</div>

		{#if badges.length > 0}
			<ul class="mt-3 flex flex-wrap gap-1.5">
				{#each badges as badge (badge.id)}
					<li
						class="inline-flex items-center gap-1.5 rounded-full border border-brand bg-brand-wash px-2.5 py-1 text-fluid-xs font-bold text-brand-ink"
						title={badge.blurb}
					>
						<Icon name={badge.icon as IconName} size={13} />
						{badge.label}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#if data.hidden > 0}
		<p class="leaf-card px-4 py-3 text-fluid-sm text-ink-soft">
			{user.name} keeps their activities private. You'll see them once you're in one together.
		</p>
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
				Been to
			</h2>
			<ul class="flex flex-col gap-3 opacity-65">
				{#each data.past as activity (activity.id)}
					<li><ActivityCard {activity} /></li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.hidden === 0 && data.upcoming.length === 0 && data.past.length === 0}
		<p class="leaf-card px-4 py-3 text-fluid-sm text-ink-soft">
			Nothing of {user.name}'s to show you yet.
		</p>
	{/if}
</div>
