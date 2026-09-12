<script lang="ts">
	import { page } from '$app/state';
	import type { User } from '$lib/types';
	import Avatar from './Avatar.svelte';
	import Icon from './Icon.svelte';
	import GrassIcon from './GrassIcon.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	interface Props {
		user: User;
		onmenu: () => void;
	}

	let { user, onmenu }: Props = $props();

	/* Keep the search box in sync with ?q= so a back-navigation reads right. */
	let q = $derived(page.url.searchParams.get('q') ?? '');
</script>

<header class="sticky top-0 z-30 border-b border-hedge bg-surface">
	<div class="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-2 px-gutter sm:gap-3">
		<button
			type="button"
			class="-ml-2 rounded-full p-2 hover:bg-surface-hover lg:hidden"
			aria-label="Open navigation"
			onclick={onmenu}
		>
			<Icon name="menu" size={22} />
		</button>

		<a href="/" class="flex shrink-0 items-center gap-1.5" aria-label="Tagalong home">
			<span
				class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand text-on-brand"
			>
				<GrassIcon size={18} strokeWidth={2.25} />
			</span>
			<span class="hidden text-fluid-lg font-extrabold tracking-tight text-ink sm:inline">
				tagalong
			</span>
		</a>

		<form action="/" method="GET" class="min-w-0 flex-1" role="search">
			<label class="relative block">
				<span class="sr-only">Search activities</span>
				<span
					class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-muted"
				>
					<Icon name="search" size={16} />
				</span>
				<input
					type="search"
					name="q"
					value={q}
					placeholder="Search activities"
					class="field h-9 rounded-full pl-9 sm:max-w-md"
					autocomplete="off"
				/>
			</label>
		</form>

		<!-- Desktop only: below md the mobile tab bar carries the create action. -->
		<a
			href="/activities/new"
			class="btn btn-primary hidden shrink-0 px-4 md:inline-flex"
			title="New activity"
		>
			<Icon name="plus" size={16} strokeWidth={3} />
			Create
		</a>

		<ThemeToggle />

		<a href="/profile" class="shrink-0 rounded-full" aria-label="Your profile">
			<Avatar {user} />
		</a>
	</div>
</header>
