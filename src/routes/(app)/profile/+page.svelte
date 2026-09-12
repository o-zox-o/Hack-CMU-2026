<script lang="ts">
	import { enhance } from '$app/forms';
	import ActivityCard from '$lib/components/ActivityCard.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import InterestPicker from '$lib/components/InterestPicker.svelte';
	import Garden from '$lib/components/Garden.svelte';
	import { earnedBadges, grassStats, nextBadge } from '$lib/grass';
	import { campusMeta } from '$lib/types';

	let { data, form } = $props();

	let user = $derived(data.user);

	let joinedYear = $derived(new Date(user.joinedAt).getFullYear());

	let stats = $derived(grassStats(data.hosting, data.joined));
	let badgeContext = $derived({ stats, isTopToucher: data.isTopToucher });
	let badges = $derived(earnedBadges(badgeContext));
	let upcomingBadge = $derived(nextBadge(badgeContext));
</script>

<svelte:head>
	<title>{user.name} · Tagalong</title>
</svelte:head>

<div class="flex flex-col gap-3">
	<!-- Profile header -->
	<section class="leaf-card overflow-hidden">
		<div class="h-16 w-full bg-clover-500 sm:h-20"></div>
		<div class="px-4 pb-4 sm:px-5">
			<!-- Only the avatar overlaps the banner; the text starts below it. -->
			<div class="-mt-6 flex items-start gap-3">
				<span class="rounded-full ring-4 ring-surface">
					<Avatar {user} size="lg" />
				</span>
				<div class="min-w-0 pt-7">
					<h1 class="truncate text-fluid-xl font-extrabold text-ink">{user.name}</h1>
					<p class="text-fluid-xs text-ink-muted">
						@{user.handle} · {campusMeta(user.campus).label} · since {joinedYear}
					</p>
				</div>
			</div>
			{#if user.bio}
				<p class="mt-3 text-fluid-sm text-ink-soft">{user.bio}</p>
			{/if}
			<div class="mt-3 flex flex-wrap items-end justify-between gap-3">
				<dl class="flex gap-6 text-fluid-xs">
					<div>
						<dd class="text-fluid-lg font-extrabold text-ink">{data.hosting.length}</dd>
						<dt class="text-ink-muted">hosting</dt>
					</div>
					<div>
						<dd class="text-fluid-lg font-extrabold text-ink">{data.joined.length}</dd>
						<dt class="text-ink-muted">joined</dt>
					</div>
				</dl>
				<form method="POST" action="?/logout" use:enhance>
					<button type="submit" class="btn btn-ghost">
						<Icon name="exit" size={14} /> Log out
					</button>
				</form>
			</div>
		</div>
	</section>

	{#if data.standing.warned}
		<div class="rounded-card border border-berry-500 bg-berry-500/10 p-4">
			<h2 class="flex items-center gap-1.5 text-fluid-sm font-extrabold text-berry-500">
				<Icon name="close" size={15} strokeWidth={3} /> Your account has a warning
			</h2>
			<p class="mt-1 text-fluid-sm text-ink-soft">
				{data.standing.poorlyRated} of your activities were rated poorly by the people who went. Ratings
				are anonymous, so there's nobody to take it up with — but showing up, being on time and charging
				what you said you would is usually the whole of it. Keep it up and hosting may be limited.
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

	<!-- Touch grass: the score, the garden it grows, and what it earned -->
	<section class="leaf-card p-4 sm:p-5">
		<div class="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
			<div>
				<h2 class="text-fluid-xs font-extrabold tracking-wider text-ink-muted uppercase">
					Grass touched
				</h2>
				<p class="mt-0.5 flex items-baseline gap-1.5">
					<span class="text-fluid-2xl font-extrabold text-brand-ink">{stats.score}</span>
					<span class="text-fluid-sm text-ink-soft">
						{stats.score === 1 ? 'activity' : 'activities'}
					</span>
				</p>
			</div>
			<dl class="flex gap-4 text-fluid-xs">
				<div>
					<dd class="font-extrabold text-ink">{stats.touched}</dd>
					<dt class="text-ink-muted">been to</dt>
				</div>
				<div>
					<dd class="font-extrabold text-ink">{stats.growing}</dd>
					<dt class="text-ink-muted">coming up</dt>
				</div>
				<div>
					<dd class="font-extrabold text-ink">{stats.hosted}</dd>
					<dt class="text-ink-muted">hosted</dt>
				</div>
			</dl>
		</div>

		<div class="mt-3">
			<Garden score={stats.score} seed={user.id} />
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

		{#if upcomingBadge}
			<p class="mt-2 text-fluid-xs text-ink-muted">
				Next up: <span class="font-bold text-ink-soft">{upcomingBadge.label}</span> — {upcomingBadge.blurb}.
			</p>
		{/if}
	</section>

	<!-- Profile: bio, city, and the interests the "For you" feed ranks against -->
	<section class="leaf-card p-4 sm:p-5">
		<h2 class="text-fluid-xs font-extrabold tracking-wider text-ink-muted uppercase">
			Your profile
		</h2>
		<form method="POST" action="?/profile" class="mt-3 flex flex-col gap-4" use:enhance>
			<div>
				<span class="label">
					Interests <span class="font-semibold text-brand-ink">— these build your feed</span>
				</span>
				<InterestPicker selected={user.interests} />
			</div>

			{#if data.learned.length > 0}
				<div>
					<span class="label">
						Picked up from what you join
						<span class="font-semibold text-ink-muted">— only you see these</span>
					</span>
					<ul class="flex flex-wrap gap-1.5">
						{#each data.learned as tag (tag)}
							<li
								class="rounded-full border border-dashed border-hedge-strong px-3 py-1 text-fluid-xs font-bold text-ink-soft"
							>
								{tag}
							</li>
						{/each}
					</ul>
					<p class="mt-1.5 text-fluid-xs text-ink-muted">
						Join three of something and it starts shaping your feed. Tick it above to make it
						public.
					</p>
				</div>
			{/if}

			<div>
				<label class="label" for="bio">About you</label>
				<textarea id="bio" name="bio" class="field min-h-20 resize-y" maxlength="300"
					>{user.bio}</textarea
				>
			</div>

			<div>
				<span class="label">Privacy</span>
				<label
					class="flex cursor-pointer items-start gap-2.5 rounded-lg border border-hedge bg-surface-sunk p-3"
				>
					<input
						type="checkbox"
						name="isPrivate"
						checked={user.isPrivate ?? false}
						class="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]"
					/>
					<span>
						<span class="block text-fluid-sm font-bold text-ink">Private profile</span>
						<span class="block text-fluid-xs text-ink-muted">
							Your comments are only shown to people who joined that activity. Everyone else sees
							that a comment is there, not who wrote it or what it says.
						</span>
					</span>
				</label>
			</div>

			<div class="flex items-center gap-3">
				<button type="submit" class="btn btn-primary">Save profile</button>
				{#if form?.saved}
					<span class="inline-flex items-center gap-1 text-fluid-xs font-bold text-brand-ink">
						<Icon name="check" size={14} strokeWidth={3} /> Saved
					</span>
				{/if}
			</div>
		</form>
	</section>

	<a
		href="/my-activities"
		class="leaf-card flex items-center gap-3 px-4 py-3 text-fluid-sm font-bold text-ink transition-colors hover:bg-surface-hover"
	>
		<Icon name="myActivities" size={18} class="text-brand-ink" />
		See all my activities in one place
		<Icon name="arrowUp" size={16} class="ml-auto rotate-90 text-ink-muted" />
	</a>

	<!-- Hosting -->
	<section class="flex flex-col gap-3">
		<h2 class="px-1 text-fluid-xs font-extrabold tracking-wider text-ink-muted uppercase">
			Hosting
		</h2>
		{#if data.hosting.length === 0}
			<div
				class="leaf-card flex items-center justify-between gap-3 px-4 py-3 text-fluid-sm text-ink-soft"
			>
				You aren't hosting anything yet.
				<a href="/activities/new" class="btn btn-primary shrink-0">
					<Icon name="plus" size={14} strokeWidth={3} /> Post one
				</a>
			</div>
		{:else}
			<ul class="flex flex-col gap-3">
				{#each data.hosting as activity (activity.id)}
					<li><ActivityCard {activity} /></li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Joined -->
	<section class="flex flex-col gap-3">
		<h2 class="px-1 text-fluid-xs font-extrabold tracking-wider text-ink-muted uppercase">
			Joined
		</h2>
		{#if data.joined.length === 0}
			<div class="leaf-card px-4 py-3 text-fluid-sm text-ink-soft">
				Nothing joined yet — <a href="/" class="font-bold text-brand-ink hover:underline"
					>browse the feed</a
				>.
			</div>
		{:else}
			<ul class="flex flex-col gap-3">
				{#each data.joined as activity (activity.id)}
					<li><ActivityCard {activity} /></li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
