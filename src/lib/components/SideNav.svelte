<script lang="ts">
	import { page } from '$app/state';
	import { CAMPUSES, CATEGORIES, campusMeta, type User } from '$lib/types';
	import Icon from './Icon.svelte';

	interface Props {
		user: User;
	}

	let { user }: Props = $props();

	let path = $derived(page.url.pathname);
	let params = $derived(page.url.searchParams);
	let activeCategory = $derived(params.get('category'));
	let activeCampus = $derived(params.get('campus'));
	let isFree = $derived(params.get('free') === '1');

	/* Home = the plain feed for your own campus, nothing else set. */
	let isHome = $derived(
		path === '/' && !activeCategory && !activeCampus && !isFree && !params.get('q')
	);

	const link =
		'flex items-center gap-2.5 rounded-lg px-3 py-2 text-fluid-sm font-bold transition-colors';
	const idle = 'text-ink-soft hover:bg-surface-hover hover:text-ink';
	const active = 'bg-brand-wash text-brand-ink';
</script>

<nav aria-label="Primary" class="flex flex-col gap-5">
	<ul class="flex flex-col gap-0.5">
		<li>
			<a
				href="/"
				class="{link} {isHome ? active : idle}"
				aria-current={isHome ? 'page' : undefined}
			>
				<Icon name="home" size={18} /> Home
				<span class="ml-auto text-fluid-xs text-ink-muted">{campusMeta(user.campus).short}</span>
			</a>
		</li>
		<li>
			<a
				href="/?free=1"
				class="{link} {isFree && path === '/' ? active : idle}"
				aria-current={isFree && path === '/' ? 'page' : undefined}
			>
				<span class="w-[18px] text-center" aria-hidden="true">🎁</span> Free stuff
			</a>
		</li>
		<li>
			<a
				href="/profile"
				class="{link} {path === '/profile' ? active : idle}"
				aria-current={path === '/profile' ? 'page' : undefined}
			>
				<Icon name="user" size={18} /> Profile
			</a>
		</li>
	</ul>

	<section>
		<h2 class="mb-1.5 px-3 text-fluid-xs font-extrabold tracking-wider text-ink-muted uppercase">
			Categories
		</h2>
		<ul class="flex flex-col gap-0.5">
			{#each CATEGORIES as category (category.id)}
				{@const isActive = activeCategory === category.id}
				<li>
					<a
						href="/?category={category.id}"
						class="{link} {isActive ? active : idle}"
						aria-current={isActive ? 'page' : undefined}
					>
						<span class="w-[18px] text-center" aria-hidden="true">{category.emoji}</span>
						{category.label}
					</a>
				</li>
			{/each}
		</ul>
	</section>

	<section>
		<h2 class="mb-1.5 px-3 text-fluid-xs font-extrabold tracking-wider text-ink-muted uppercase">
			Campuses
		</h2>
		<ul class="flex flex-col gap-0.5">
			<li>
				<a
					href="/?campus=all"
					class="{link} {activeCampus === 'all' ? active : idle}"
					aria-current={activeCampus === 'all' ? 'page' : undefined}
				>
					<Icon name="compass" size={18} /> All campuses
				</a>
			</li>
			{#each CAMPUSES as campus (campus.id)}
				{@const isActive = activeCampus === campus.id}
				<li>
					<a
						href="/?campus={campus.id}"
						class="{link} {isActive ? active : idle}"
						aria-current={isActive ? 'page' : undefined}
					>
						<span class="ml-1 h-2 w-2 rounded-full bg-hedge-strong" aria-hidden="true"></span>
						{campus.short}
						{#if campus.id === user.campus}
							<span class="ml-auto text-fluid-xs text-ink-muted">yours</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</section>
</nav>
