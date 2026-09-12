<script lang="ts">
	import { garden, stageFor, stageProgress, nextStage } from '$lib/grass';

	interface Props {
		score: number;
		/** Keeps one person's garden looking the same on every visit. */
		seed: string;
	}

	let { score, seed }: Props = $props();

	let plants = $derived(garden(score, seed));
	let stage = $derived(stageFor(score));
	let progress = $derived(stageProgress(score));
	let next = $derived(nextStage(score));

	/* Greens that stay legible in both themes. */
	const GREENS = ['#46a53c', '#35862f', '#5cb551', '#2b6a27'];
	const PETALS = ['#f7c6a8', '#fbdce4', '#f3c94e', '#b7d3e3', '#c96f5c'];
</script>

<div class="overflow-hidden rounded-card border border-hedge bg-surface-sunk">
	<!--
		Each plant is positioned with CSS at its own left%, rather than drawn into
		one wide SVG. A single SVG letterboxes inside the card, which parked the
		whole garden in the middle; this way the planter spans the full width and
		every blade keeps its own proportions.
	-->
	<div
		class="relative h-28 w-full"
		role="img"
		aria-label="{stage.name} — {score} {score === 1 ? 'activity' : 'activities'}"
	>
		{#if plants.length === 0}
			<p class="absolute inset-0 flex items-center justify-center text-fluid-xs text-ink-muted">
				Nothing planted yet — join something.
			</p>
		{/if}

		{#each plants as plant, i (i)}
			{@const tall = plant.kind === 'blade' ? 52 : 66}
			{@const height = Math.round(tall * plant.height)}
			{@const green = GREENS[plant.hue % GREENS.length]}
			{@const bend = plant.lean * 7}
			{@const base = plant.kind === 'blade' ? 1.7 : 0.9}
			<span class="absolute bottom-2" style="left:{plant.x}%; height:{height}px">
				<svg
					width="24"
					{height}
					viewBox="0 0 24 {height}"
					class="block -translate-x-1/2 overflow-visible"
					aria-hidden="true"
				>
					{#if plant.kind === 'blade'}
						<!-- A closed, tapered leaf: wide at the soil, pointed at the tip. -->
						<path
							d="M{12 - base} {height}
							   Q {12 + bend * 0.3} {height * 0.45} {12 + bend} 0
							   Q {12 + bend * 0.5} {height * 0.5} {12 + base} {height} Z"
							fill={green}
						/>
					{:else}
						<path
							d="M12 {height} Q {12 + bend * 0.3} {height * 0.45} {12 + bend} 3"
							fill="none"
							stroke={green}
							stroke-width="1.4"
							stroke-linecap="round"
						/>
						{#if plant.kind === 'bud'}
							<circle cx={12 + bend} cy="2.6" r="2.6" fill={green} />
						{:else}
							{@const petal = PETALS[plant.hue % PETALS.length]}
							{#each [0, 72, 144, 216, 288] as angle (angle)}
								<ellipse
									cx={12 + bend}
									cy="3.4"
									rx="1.7"
									ry="3.4"
									fill={petal}
									transform="rotate({angle} {12 + bend} 3.4)"
								/>
							{/each}
							<circle cx={12 + bend} cy="3.4" r="1.5" fill="#f3c94e" />
						{/if}
					{/if}
				</svg>
			</span>
		{/each}

		<!-- soil -->
		<div class="absolute inset-x-0 bottom-0 h-3 bg-hedge-strong opacity-60"></div>
	</div>

	<div class="border-t border-hedge px-3 py-2">
		<div class="flex flex-wrap items-baseline gap-x-2">
			<span class="text-fluid-sm font-extrabold text-ink">{stage.name}</span>
			<span class="text-fluid-xs text-ink-muted">{stage.blurb}</span>
		</div>

		{#if next}
			<div class="mt-1.5 flex items-center gap-2">
				<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-hedge">
					<div
						class="h-full rounded-full bg-brand transition-[width]"
						style="width: {Math.round(progress * 100)}%"
					></div>
				</div>
				<span class="text-[0.6rem] font-bold whitespace-nowrap text-ink-muted">
					{next.from - score} to {next.name}
				</span>
			</div>
		{/if}
	</div>
</div>
