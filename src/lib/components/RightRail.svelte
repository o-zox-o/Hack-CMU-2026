<script lang="ts">
	import { formatMiles } from '$lib/format';
	import LocationSync from './LocationSync.svelte';

	interface Props {
		/** Open (not full, upcoming) activities in the scope the user is viewing. */
		open: number;
		/** What that scope is, e.g. "open at Pitt" / "open within 50 mi". */
		openLabel: string;
		locationSource: 'gps' | 'campus';
		nearest: { short: string; miles: number };
	}

	let { open, openLabel, locationSource, nearest }: Props = $props();
</script>

<aside class="flex flex-col gap-4">
	<!-- About / create -->
	<section class="leaf-card overflow-hidden">
		<div class="h-9 w-full bg-clover-500"></div>
		<div class="p-4">
			<h2 class="text-fluid-lg font-extrabold text-ink">Tagalong</h2>
			<p class="mt-1 text-fluid-sm text-ink-soft">
				Post the thing you were going to do anyway. Let people nearby tag along and split the cost.
			</p>
			<dl class="mt-3 flex gap-5 text-fluid-xs">
				<div>
					<dd class="text-fluid-lg font-extrabold text-ink">{open}</dd>
					<dt class="text-ink-muted">{openLabel}</dt>
				</div>
				<div>
					<dd class="text-fluid-lg font-extrabold text-ink">{nearest.short}</dd>
					<dt class="text-ink-muted">closest · {formatMiles(nearest.miles)}</dt>
				</div>
			</dl>
			<div class="mt-3">
				<LocationSync source={locationSource} variant="button" />
			</div>
		</div>
	</section>

	<!-- How it works -->
	<section class="leaf-card p-4">
		<h2 class="text-fluid-xs font-extrabold tracking-wider text-ink-muted uppercase">
			How it works
		</h2>
		<ol class="mt-2 flex flex-col gap-2.5 text-fluid-sm">
			<li class="flex gap-2.5">
				<span
					class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-wash text-fluid-xs font-extrabold text-brand-ink"
					>1</span
				>
				<span class="text-ink-soft">Post a run, a ride, or a plan with open seats.</span>
			</li>
			<li class="flex gap-2.5">
				<span
					class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-wash text-fluid-xs font-extrabold text-brand-ink"
					>2</span
				>
				<span class="text-ink-soft">People on your campus join until it's full.</span>
			</li>
			<li class="flex gap-2.5">
				<span
					class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-wash text-fluid-xs font-extrabold text-brand-ink"
					>3</span
				>
				<span class="text-ink-soft">Meet up, split the bill, everyone saves.</span>
			</li>
		</ol>
	</section>

	<!-- Ground rules -->
	<section class="leaf-card p-4">
		<h2 class="text-fluid-xs font-extrabold tracking-wider text-ink-muted uppercase">
			Ground rules
		</h2>
		<ul class="mt-2 flex list-inside list-disc flex-col gap-1 text-fluid-sm text-ink-soft">
			<li>Say the real price up front.</li>
			<li>If you can't make it, leave so someone else can join.</li>
			<li>Be the kind of person you'd want in your Uber.</li>
		</ul>
	</section>

	<p class="px-1 text-fluid-xs text-ink-muted">Hack CMU 2026 · Built in Pittsburgh</p>
</aside>
