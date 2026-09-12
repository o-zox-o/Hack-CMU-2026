<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import LocationSync from '$lib/components/LocationSync.svelte';
	import MobileTabBar from '$lib/components/MobileTabBar.svelte';
	import RightRail from '$lib/components/RightRail.svelte';
	import SideNav from '$lib/components/SideNav.svelte';

	let { data, children } = $props();

	/* Off-canvas nav for < lg. Closes itself whenever the route changes. */
	let drawerOpen = $state(false);
	afterNavigate(() => (drawerOpen = false));
</script>

<!-- Asks the browser for a position once and stores it in the `loc` cookie. -->
<LocationSync auto source={data.locationSource} />

<AppHeader user={data.user} onmenu={() => (drawerOpen = true)} />

<!-- Reddit's three-column shell: nav · feed · rail. Columns drop off as the
     viewport narrows (rail at xl, nav at lg), the feed column always stays. -->
<div class="mx-auto flex w-full max-w-[1280px] justify-center gap-6 px-gutter pt-4 pb-24 md:pb-8">
	<div class="hidden w-56 shrink-0 lg:block">
		<div class="sticky top-[4.5rem]">
			<SideNav user={data.user} campuses={data.campuses} />
		</div>
	</div>

	<main class="w-full max-w-[760px] min-w-0 flex-1">
		{@render children()}
	</main>

	<div class="hidden w-[300px] shrink-0 xl:block">
		<div class="sticky top-[4.5rem]">
			<RightRail
				openNearby={data.openNearby}
				locationSource={data.locationSource}
				nearest={data.campuses[0]}
			/>
		</div>
	</div>
</div>

{#if drawerOpen}
	<div class="fixed inset-0 z-40 lg:hidden">
		<button
			type="button"
			class="absolute inset-0 bg-black/40"
			aria-label="Close navigation"
			onclick={() => (drawerOpen = false)}
		></button>
		<div
			class="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-surface p-4 shadow-lift"
		>
			<div class="mb-4 flex items-center justify-between">
				<span class="text-fluid-lg font-extrabold text-ink">tagalong</span>
				<button
					type="button"
					class="rounded-full p-1.5 hover:bg-surface-hover"
					aria-label="Close navigation"
					onclick={() => (drawerOpen = false)}
				>
					<Icon name="close" size={20} />
				</button>
			</div>
			<SideNav user={data.user} campuses={data.campuses} />
		</div>
	</div>
{/if}

<MobileTabBar />
