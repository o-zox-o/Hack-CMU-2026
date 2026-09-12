<script lang="ts">
	import { celebration } from '$lib/celebrate.svelte';
	import GrassIcon from './GrassIcon.svelte';

	/* Emoji are deliberate here — this is confetti, not iconography. */
	const BLADES = ['🌱', '🌿', '☘️', '🍀', '🌾'];
	const COUNT = 28;

	/* Fixed per mount so the fall doesn't reshuffle mid-animation. */
	const drops = Array.from({ length: COUNT }, (_, i) => ({
		glyph: BLADES[i % BLADES.length],
		left: (i * 37) % 100,
		delay: (i % 9) * 0.13,
		duration: 2.1 + ((i * 7) % 11) * 0.09,
		drift: ((i % 5) - 2) * 14,
		spin: ((i % 7) - 3) * 60,
		size: 0.9 + ((i * 3) % 5) * 0.22
	}));
</script>

{#if celebration.message}
	<!-- Pointer-events off so it never blocks the page it's celebrating. -->
	<div class="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
		{#each drops as drop, i (i)}
			<span
				class="blade absolute top-0 select-none"
				style="left:{drop.left}%; font-size:{drop.size}rem;
				       --delay:{drop.delay}s; --duration:{drop.duration}s;
				       --drift:{drop.drift}px; --spin:{drop.spin}deg"
			>
				{drop.glyph}
			</span>
		{/each}
	</div>

	<!-- The message itself is announced; the rain is decoration. -->
	<div
		class="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-gutter md:bottom-8"
	>
		<p
			class="leaf-card pointer-events-auto flex items-center gap-2 px-4 py-2.5 text-fluid-sm font-bold text-ink shadow-lift"
			role="status"
		>
			<GrassIcon size={18} class="text-brand-ink" />
			{celebration.message}
		</p>
	</div>
{/if}

<style>
	.blade {
		animation: fall var(--duration) linear var(--delay) 1 forwards;
		will-change: transform, opacity;
	}

	@keyframes fall {
		0% {
			transform: translate3d(0, -12vh, 0) rotate(0deg);
			opacity: 0;
		}
		10% {
			opacity: 1;
		}
		85% {
			opacity: 1;
		}
		100% {
			transform: translate3d(var(--drift), 105vh, 0) rotate(var(--spin));
			opacity: 0;
		}
	}

	/* Keep the message, drop the weather. */
	@media (prefers-reduced-motion: reduce) {
		.blade {
			display: none;
		}
	}
</style>
