<script lang="ts">
	/**
	 * A tuft of grass. Lucide has no grass icon, and Sprout/Leaf both read as
	 * "one plant" rather than "go outside", so this is drawn to match Lucide's
	 * geometry: 24x24 box, round caps, stroke-driven.
	 */
	interface Props {
		size?: number;
		class?: string;
		strokeWidth?: number;
	}

	let { size = 18, class: className = '', strokeWidth = 2 }: Props = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	class="shrink-0 {className}"
	aria-hidden="true"
>
	<!-- three blades fanning out of one patch, plus the ground line -->
	<path d="M12 20V9" />
	<path d="M12 12C9.5 11 8 8.5 8 5c2.8.6 4 2.9 4 7z" />
	<path d="M12 11c2.5-1 4-3.5 4-7-2.8.6-4 2.9-4 7z" />
	<path d="M7 20c-1.2-2.4-1.6-4.6-1.2-6.6 2 1 3.1 3.2 3.2 6.6" />
	<path d="M17 20c1.2-2.4 1.6-4.6 1.2-6.6-2 1-3.1 3.2-3.2 6.6" />
	<path d="M4 20h16" />
</svg>
