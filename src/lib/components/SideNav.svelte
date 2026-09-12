<script lang="ts">
	import { page } from '$app/state';
	import { formatMiles } from '$lib/format';
	import { CATEGORIES, type CampusId, type User } from '$lib/types';
	import Icon from './Icon.svelte';

	interface Props {
		user: User;
		/** Campuses nearest-first, each with `miles` from the viewer. */
		campuses: { id: CampusId; short: string; label: string; miles: number }[];
	}

	let { user, campuses }: Props = $props();

	let path = $derived(page.url.pathname);
	let params = $derived(page.url.searchParams);
	let activeCategory = $derived(params.get('category'));
	let activeCampus = $derived(params.get('campus'));
	let activeWithin = $derived(params.get('within'));
	let isFree = $derived(params.get('free') === '1');

	/* Home = the plain "near you" feed, nothing else set. */
	let isHome = $derived(
		path === '/' && !activeCategory && !activeCampus && !activeWithin && !isFree && !params.get('q')
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
				<Icon name="sparkles" size={18} /> For you
			</a>
		</li>
		<li>
			<a
				href="/my-activities"
				class="{link} {path === '/my-activities' ? active : idle}"
				aria-current={path === '/my-activities' ? 'page' : undefined}
			>
				<Icon name="myActivities" size={18} /> My activities
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
			<!-- A price filter rather than a category, but it browses the feed the
			     same way, so it belongs with these and not with the destinations. -->
			<li>
				<a
					href="/?free=1"
					class="{link} {isFree && path === '/' ? active : idle}"
					aria-current={isFree && path === '/' ? 'page' : undefined}
				>
					<Icon name="gift" size={18} /> Free stuff
				</a>
			</li>
			{#each CATEGORIES as category (category.id)}
				{@const isActive = activeCategory === category.id}
				<li>
					<a
						href="/?category={category.id}"
						class="{link} {isActive ? active : idle}"
						aria-current={isActive ? 'page' : undefined}
					>
						<Icon name={category.icon} size={18} />
						{category.label}
					</a>
				</li>
			{/each}
		</ul>
	</section>

	<section>
		<h2 class="mb-1.5 px-3 text-fluid-xs font-extrabold tracking-wider text-ink-muted uppercase">
			Campuses <span class="font-semibold tracking-normal normal-case">· nearest first</span>
		</h2>
		<ul class="flex flex-col gap-0.5">
			{#each campuses as campus (campus.id)}
				{@const isActive = activeCampus === campus.id}
				<li>
					<a
						href="/?campus={campus.id}"
						class="{link} {isActive ? active : idle}"
						aria-current={isActive ? 'page' : undefined}
						title={campus.label}
					>
						<span
							class="ml-1 h-2 w-2 rounded-full {campus.id === user.campus
								? 'bg-brand'
								: 'bg-hedge-strong'}"
							aria-hidden="true"
						></span>
						{campus.short}
						<span class="ml-auto text-fluid-xs text-ink-muted">{formatMiles(campus.miles)}</span>
					</a>
				</li>
			{/each}
			<li>
				<a
					href="/?within=all"
					class="{link} {activeWithin === 'all' ? active : idle}"
					aria-current={activeWithin === 'all' ? 'page' : undefined}
				>
					<Icon name="compass" size={18} /> Anywhere
				</a>
			</li>
		</ul>
	</section>
</nav>
