<script lang="ts">
	import { enhance } from '$app/forms';
	import ActivityCard from '$lib/components/ActivityCard.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import InterestPicker from '$lib/components/InterestPicker.svelte';
	import { campusMeta } from '$lib/types';

	let { data, form } = $props();

	let user = $derived(data.user);

	let joinedYear = $derived(new Date(user.joinedAt).getFullYear());
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

	<!-- Interests: what the "For you" feed ranks against -->
	<section class="leaf-card p-4 sm:p-5">
		<h2 class="text-fluid-xs font-extrabold tracking-wider text-ink-muted uppercase">
			Your interests
		</h2>
		<p class="mt-1 text-fluid-sm text-ink-soft">These decide what shows up first in your feed.</p>
		<form method="POST" action="?/interests" class="mt-3" use:enhance>
			<InterestPicker selected={user.interests} />
			<div class="mt-3 flex items-center gap-3">
				<button type="submit" class="btn btn-primary">Save interests</button>
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
