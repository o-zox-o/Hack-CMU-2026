<script lang="ts">
	interface Props {
		taken: number;
		total: number;
		/** Show the little dot row as well as the count. */
		dots?: boolean;
	}

	let { taken, total, dots = true }: Props = $props();

	let left = $derived(Math.max(0, total - taken));
	let full = $derived(left === 0);
</script>

<span class="inline-flex items-center gap-1.5" title="{taken} of {total} spots taken">
	{#if dots}
		<span class="flex gap-0.5" aria-hidden="true">
			{#each Array.from({ length: total }, (_, i) => i) as i (i)}
				<span class="h-1.5 w-1.5 rounded-full {i < taken ? 'bg-brand' : 'bg-hedge-strong'}"></span>
			{/each}
		</span>
	{/if}
	<span class="text-fluid-xs font-bold {full ? 'text-berry-500' : 'text-ink-muted'}">
		{full ? 'Full' : `${left} spot${left === 1 ? '' : 's'} left`}
	</span>
</span>
