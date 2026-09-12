<script lang="ts">
	import { onMount } from 'svelte';
	import 'leaflet/dist/leaflet.css';
	import type { Map as LeafletMap, Marker } from 'leaflet';
	import { avatarSwatch } from '$lib/avatar';
	import { haversineMiles } from '$lib/geo';
	import { formatClock, formatNearby, initials, timeAgo } from '$lib/format';
	import { campusMeta, type ActivityView, type LiveLocationView } from '$lib/types';
	import Avatar from './Avatar.svelte';
	import Icon from './Icon.svelte';

	interface Props {
		activity: ActivityView;
		/** Whoever is looking, so their own pin can say "You". */
		meId: string;
	}

	let { activity, meId }: Props = $props();

	/* Both well inside the server's expiry, so a marker going stale means they
	   really stopped rather than that we were slow. */
	const POLL_MS = 10_000;
	const PUSH_MS = 15_000;

	let sharing = $state(false);
	let people = $state<LiveLocationView[]>([]);
	let mine = $state<{ lat: number; lng: number } | null>(null);
	let error = $state<string | null>(null);
	let busy = $state(false);

	let container = $state<HTMLDivElement | null>(null);
	let map: LeafletMap | null = null;
	let leaflet: typeof import('leaflet') | null = null;
	const markers = new Map<string, Marker>();
	/* Auto-framing stops the moment the viewer moves the map themselves. */
	let autoFit = true;

	/** Nearest first, once we know where we are to measure from. */
	let listed = $derived(
		people
			.map((p) => ({ ...p, miles: mine ? haversineMiles(mine, { lat: p.lat, lng: p.lng }) : null }))
			.sort((a, b) => (a.miles ?? Infinity) - (b.miles ?? Infinity))
	);

	/* ---- the map ---------------------------------------------------------- */

	onMount(() => {
		let cancelled = false;

		(async () => {
			// Leaflet touches `window` on import, so it can only load in here.
			const mod = await import('leaflet');
			if (cancelled || !container) return;
			leaflet = mod.default ?? mod;

			const home = campusMeta(activity.campus);
			map = leaflet.map(container).setView([home.lat, home.lng], 15);
			leaflet
				.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
					maxZoom: 19,
					attribution: '© OpenStreetMap'
				})
				.addTo(map);

			map.on('dragstart zoomstart', () => (autoFit = false));
			draw();
		})();

		const poll = setInterval(refresh, POLL_MS);
		const push = setInterval(() => {
			if (sharing) pushPosition();
		}, PUSH_MS);
		refresh();

		return () => {
			cancelled = true;
			clearInterval(poll);
			clearInterval(push);
			// Leaving stops it now rather than waiting for the point to expire.
			if (sharing) void fetch(`/activities/${activity.id}/where`, { method: 'DELETE' });
			map?.remove();
			map = null;
		};
	});

	/** Text going into an HTML string needs escaping; names are user input. */
	function escape(text: string): string {
		return text.replace(
			/[&<>"']/g,
			(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c
		);
	}

	/**
	 * A div marker rather than Leaflet's default pin: the default icon's image
	 * paths break under a bundler, and a row of identical teardrops tells you
	 * nothing. The circle carries the person's own avatar colour, so a pin
	 * matches the face next to their name everywhere else in the app.
	 *
	 * The name rides underneath, always visible, so you can read the map
	 * without clicking anything. It's absolutely positioned so a long name
	 * can't shift the circle off the coordinate it marks.
	 */
	function iconFor(person: LiveLocationView, isMe: boolean) {
		const { bg, fg } = avatarSwatch(person.user.avatarSeed);
		return leaflet!.divIcon({
			className: '',
			html:
				`<span class="pin-wrap${isMe ? ' is-me' : ''}">` +
				`<span class="pin" style="background:${bg};color:${fg}">` +
				`${escape(initials(person.user.name))}</span>` +
				`<span class="pin-label">${escape(isMe ? 'You' : person.user.name)}</span>` +
				`</span>`,
			iconSize: [32, 32],
			iconAnchor: [16, 16]
		});
	}

	function draw() {
		if (!map || !leaflet) return;

		const seen = new Set<string>();
		for (const person of people) {
			seen.add(person.user.id);
			const at: [number, number] = [person.lat, person.lng];
			const existing = markers.get(person.user.id);

			if (existing) {
				existing.setLatLng(at);
			} else {
				const marker = leaflet
					.marker(at, {
						icon: iconFor(person, person.user.id === meId),
						title: person.user.name
					})
					.bindPopup(
						`<strong>${escape(person.user.name)}</strong><br>@${escape(person.user.handle)}`
					);
				marker.addTo(map);
				markers.set(person.user.id, marker);
			}
		}

		// Anyone who stopped comes off the map.
		for (const [id, marker] of markers) {
			if (seen.has(id)) continue;
			marker.remove();
			markers.delete(id);
		}

		/* Frame everyone only while the view is still ours. Re-fitting on every
		   poll would yank the map back each time someone moved, which makes it
		   impossible to look at anything yourself. */
		if (autoFit && people.length > 0) {
			map.fitBounds(
				people.map((p) => [p.lat, p.lng] as [number, number]),
				{ padding: [48, 48], maxZoom: 17 }
			);
		}
	}

	/** Jump to one person and open their popup. Used by the list below. */
	function focus(userId: string) {
		const marker = markers.get(userId);
		const person = people.find((p) => p.user.id === userId);
		if (!marker || !person || !map) return;

		autoFit = false; // a deliberate choice of view outranks the auto-framing
		map.setView([person.lat, person.lng], Math.max(map.getZoom(), 17), { animate: true });
		marker.openPopup();
	}

	// Redraw whenever the roster changes.
	$effect(() => {
		void people.length;
		draw();
	});

	/* ---- talking to the server -------------------------------------------- */

	async function refresh() {
		try {
			const res = await fetch(`/activities/${activity.id}/where`);
			if (!res.ok) return;
			people = (await res.json()).people;
		} catch {
			/* a dropped poll isn't worth a message; the next one is seconds away */
		}
	}

	function pushPosition() {
		if (!('geolocation' in navigator)) {
			error = 'This browser has no location support.';
			sharing = false;
			return;
		}

		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				// The same ~11 m rounding the rest of the app uses: enough to find
				// someone at a meeting point, not a precise doorstep.
				const lat = Number(pos.coords.latitude.toFixed(4));
				const lng = Number(pos.coords.longitude.toFixed(4));
				mine = { lat, lng };

				const res = await fetch(`/activities/${activity.id}/where`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ lat, lng })
				});

				if (!res.ok) {
					error = (await res.json().catch(() => ({}))).error ?? 'Could not share your location.';
					sharing = false;
					return;
				}
				error = null;
				await refresh();
			},
			() => {
				error = 'Location is blocked in your browser settings.';
				sharing = false;
			},
			{ enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 }
		);
	}

	function start() {
		busy = true;
		error = null;
		sharing = true;
		pushPosition();
		busy = false;
	}

	async function stop() {
		busy = true;
		sharing = false;
		mine = null;
		await fetch(`/activities/${activity.id}/where`, { method: 'DELETE' });
		await refresh();
		busy = false;
	}
</script>

<section class="leaf-card overflow-hidden">
	<div class="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
		<div class="min-w-0">
			<h2 class="flex items-center gap-1.5 text-fluid-sm font-extrabold text-ink">
				<Icon name="pin" size={15} class="text-brand-ink" /> Where everyone is
			</h2>
			<p class="mt-0.5 text-fluid-xs text-ink-muted">
				{#if sharing}
					You're on the map. Sharing stops on its own at {formatClock(activity.sharingClosesAt)}.
				{:else}
					Only the {activity.spotsTaken} people in this activity can see it, and only until {formatClock(
						activity.sharingClosesAt
					)}.
				{/if}
			</p>
		</div>

		<div class="ml-auto">
			{#if sharing}
				<button type="button" class="btn btn-ghost" onclick={stop} disabled={busy}>
					<Icon name="close" size={14} strokeWidth={3} /> Stop sharing
				</button>
			{:else}
				<button type="button" class="btn btn-primary" onclick={start} disabled={busy}>
					<Icon name="pin" size={14} /> Share my location
				</button>
			{/if}
		</div>
	</div>

	{#if error}
		<p
			class="mx-4 mb-3 rounded-lg bg-berry-500/10 px-3 py-2 text-fluid-xs font-bold text-berry-500"
		>
			{error}
		</p>
	{/if}

	<!-- Fixed height so the container can't collapse before Leaflet loads. -->
	<div bind:this={container} class="h-64 w-full bg-surface-sunk sm:h-80"></div>

	<ul class="divide-y divide-hedge">
		{#each listed as person (person.user.id)}
			<li>
				<!-- Tapping a row is the easy way to find one pin among several. -->
				<button
					type="button"
					class="flex w-full items-center gap-2 px-4 py-2 text-left text-fluid-xs transition-colors hover:bg-surface-hover"
					onclick={() => focus(person.user.id)}
				>
					<Avatar user={person.user} size="sm" />
					<span class="truncate font-bold text-ink">
						{person.user.id === meId ? 'You' : person.user.name}
					</span>
					{#if person.miles !== null}
						<span class="shrink-0 text-ink-soft">{formatNearby(person.miles)}</span>
					{/if}
					<time class="ml-auto shrink-0 text-ink-muted" datetime={person.updatedAt}>
						{timeAgo(person.updatedAt)}
					</time>
					<Icon name="pin" size={12} class="shrink-0 text-ink-muted" />
				</button>
			</li>
		{:else}
			<li class="px-4 py-3 text-fluid-xs text-ink-muted">
				Nobody is sharing yet.{sharing ? '' : ' Be the first.'}
			</li>
		{/each}
	</ul>

	{#if people.length > 1}
		<p class="border-t border-hedge px-4 py-2 text-fluid-xs text-ink-muted">
			Tap a name to find them on the map.
		</p>
	{/if}
</section>

<style>
	/* Leaflet builds the marker from an HTML string, so the pin can't be a
	   component and its styles have to be global to reach inside it. */
	:global(.pin-wrap) {
		position: relative;
		display: block;
		height: 32px;
		width: 32px;
	}

	:global(.pin) {
		display: flex;
		height: 32px;
		width: 32px;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		border: 2px solid var(--surface);
		font-size: 0.7rem;
		font-weight: 800;
		box-shadow: 0 2px 6px rgb(0 0 0 / 0.35);
	}

	/* Your own pin gets a ring so you can tell yourself apart at a glance. */
	:global(.pin-wrap.is-me .pin) {
		box-shadow:
			0 0 0 3px var(--brand),
			0 2px 6px rgb(0 0 0 / 0.35);
	}

	/* Absolutely positioned so a long name can't shift the circle off the
	   coordinate it marks. */
	:global(.pin-label) {
		position: absolute;
		top: 34px;
		left: 50%;
		transform: translateX(-50%);
		max-width: 96px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		border-radius: 9999px;
		background: var(--surface);
		padding: 1px 6px;
		font-size: 0.62rem;
		font-weight: 700;
		color: var(--ink);
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
	}

	/* Leaflet's own chrome defaults to white, which fights dark mode. */
	:global(.leaflet-container) {
		background: var(--surface-sunk);
		font: inherit;
	}

	:global(.leaflet-popup-content-wrapper),
	:global(.leaflet-popup-tip),
	:global(.leaflet-control-zoom a) {
		background: var(--surface);
		color: var(--ink);
	}
</style>
