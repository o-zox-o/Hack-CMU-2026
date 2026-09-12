<script lang="ts">
	import type { GrassRank } from '$lib/types';
	import Icon from './Icon.svelte';

	interface Props {
		rank: GrassRank;
		/** Third person on someone else's profile, first person on your own. */
		mine?: boolean;
	}

	let { rank, mine = false }: Props = $props();

	let title = $derived(
		`#${rank.rank} of ${rank.total} people touching grass${mine ? '. Top 1%.' : ', in the top 1%.'}`
	);
</script>

{#if rank.isTopPercent}
	<span class="shiny" {title}>
		<Icon name="trophy" size={12} />
		Top 1%
	</span>
{/if}

<style>
	/* The one badge that's meant to look like a trophy rather than a label, so
	   it gets a gradient and a slow sweep instead of the flat pill treatment. */
	.shiny {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		position: relative;
		overflow: hidden;
		border-radius: 9999px;
		padding: 0.125rem 0.5rem;
		font-size: var(--text-fluid-xs);
		font-weight: 800;
		color: var(--shiny-ink);
		background: linear-gradient(100deg, var(--shiny-from), var(--shiny-to));
		box-shadow: inset 0 0 0 1px var(--shiny-edge);
	}

	/* The sweep. A narrow highlight that crosses every few seconds. */
	.shiny::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(100deg, transparent 20%, var(--shiny-gleam) 45%, transparent 70%);
		transform: translateX(-100%);
		animation: sweep 4.5s ease-in-out infinite;
	}

	@keyframes sweep {
		0%,
		55% {
			transform: translateX(-100%);
		}
		85%,
		100% {
			transform: translateX(100%);
		}
	}

	/* Keep the badge, drop the motion. */
	@media (prefers-reduced-motion: reduce) {
		.shiny::after {
			display: none;
		}
	}
</style>
