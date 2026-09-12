<script lang="ts">
	import { enhance } from '$app/forms';
	import ActivityCard from '$lib/components/ActivityCard.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { campusMeta } from '$lib/types';

	let { data } = $props();

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
			<dl class="mt-3 flex gap-6 text-fluid-xs">
				<div>
					<dd class="text-fluid-lg font-extrabold text-ink">{data.hosting.length}</dd>
					<dt class="text-ink-muted">hosting</dt>
				</div>
				<div>
					<dd class="text-fluid-lg font-extrabold text-ink">{data.joined.length}</dd>
					<dt class="text-ink-muted">joined</dt>
				</div>
			</dl>
		</div>
	</section>

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

	<!-- DEV ONLY: identity switcher. Delete this block when real auth lands. -->
	<section class="rounded-card border border-dashed border-sky-500/50 bg-sky-300/20 p-4">
		<h2 class="text-fluid-xs font-extrabold tracking-wider text-ink uppercase">
			Dev · switch demo user
		</h2>
		<p class="mt-1 text-fluid-xs text-ink-soft">
			Auth is stubbed. Pick another seeded user to test joining someone else's activity.
		</p>
		<form method="POST" action="?/switchUser" class="mt-2 flex flex-wrap gap-2" use:enhance>
			<select name="id" class="field max-w-xs" value={user.id}>
				{#each data.demoUsers as demo (demo.id)}
					<option value={demo.id}>{demo.name}</option>
				{/each}
			</select>
			<button type="submit" class="btn btn-ghost">Switch</button>
		</form>
	</section>
</div>
