<script lang="ts">
	import { page } from '$app/state';
	import Icon from './Icon.svelte';

	let path = $derived(page.url.pathname);

	const TABS = [
		{ href: '/', label: 'Feed', icon: 'home', match: (p: string) => p === '/' },
		{
			href: '/activities/new',
			label: 'Create',
			icon: 'plus',
			match: (p: string) => p === '/activities/new'
		},
		{ href: '/profile', label: 'Profile', icon: 'user', match: (p: string) => p === '/profile' }
	] as const;
</script>

<!-- Fixed bottom bar, phones only. Desktop uses the header + side nav. -->
<nav
	aria-label="Mobile"
	class="fixed inset-x-0 bottom-0 z-30 border-t border-hedge bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
>
	<ul class="flex">
		{#each TABS as tab (tab.href)}
			{@const isActive = tab.match(path)}
			<li class="flex-1">
				<a
					href={tab.href}
					class="flex flex-col items-center gap-0.5 py-2 text-fluid-xs font-bold transition-colors {isActive
						? 'text-brand-ink'
						: 'text-ink-muted'}"
					aria-current={isActive ? 'page' : undefined}
				>
					{#if tab.icon === 'plus'}
						<span
							class="-mt-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand text-on-brand shadow-lift"
						>
							<Icon name="plus" size={22} strokeWidth={3} />
						</span>
					{:else}
						<Icon name={tab.icon} size={22} />
					{/if}
					<span>{tab.label}</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>
