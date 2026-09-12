<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { LOCATION_COOKIE } from '$lib/geo';
	import Icon from './Icon.svelte';

	interface Props {
		/** Where the server currently thinks you are. */
		source: 'gps' | 'campus';
		/** Ask the browser on mount if we don't have a fix yet (once — a denial is remembered). */
		auto?: boolean;
		/** 'silent' renders nothing; 'button' shows the status + a "Use my location" control. */
		variant?: 'silent' | 'button';
	}

	let { source, auto = false, variant = 'silent' }: Props = $props();

	let status = $state<'idle' | 'asking' | 'denied' | 'unsupported'>('idle');
	const DENIED_KEY = 'tagalong:location-denied';

	function locate() {
		if (!('geolocation' in navigator)) {
			status = 'unsupported';
			return;
		}
		status = 'asking';
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				// 4 decimals ≈ 10 m — plenty for "which campus is closest", and not a precise home address.
				const value = `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`;
				document.cookie = `${LOCATION_COOKIE}=${value}; path=/; max-age=${30 * 24 * 3600}; samesite=lax`;
				try {
					localStorage.removeItem(DENIED_KEY);
				} catch {
					/* private mode etc. */
				}
				status = 'idle';
				invalidateAll(); // every load re-runs with the new location
			},
			() => {
				status = 'denied';
				try {
					localStorage.setItem(DENIED_KEY, '1');
				} catch {
					/* ignore */
				}
			},
			{ maximumAge: 10 * 60 * 1000, timeout: 8000 }
		);
	}

	$effect(() => {
		if (!auto || source === 'gps') return;
		try {
			if (localStorage.getItem(DENIED_KEY)) return;
		} catch {
			/* ignore */
		}
		locate();
	});
</script>

{#if variant === 'button'}
	{#if source === 'gps'}
		<span class="inline-flex items-center gap-1 text-fluid-xs font-bold text-ink-soft">
			<Icon name="pin" size={14} class="text-brand-ink" /> Using your location
		</span>
	{:else}
		<button
			type="button"
			class="inline-flex items-center gap-1 text-fluid-xs font-bold text-brand-ink hover:underline disabled:opacity-60"
			onclick={locate}
			disabled={status === 'asking'}
		>
			<Icon name="pin" size={14} />
			{#if status === 'asking'}
				Locating…
			{:else if status === 'denied'}
				Location blocked, try again
			{:else if status === 'unsupported'}
				Location unavailable here
			{:else}
				Use my location
			{/if}
		</button>
	{/if}
{/if}
