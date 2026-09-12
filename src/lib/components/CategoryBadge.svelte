<script lang="ts">
	import { categoryMeta, type CategoryId } from '$lib/types';

	interface Props {
		category: CategoryId;
		/** Render as a link back into the filtered feed. */
		href?: string;
	}

	let { category, href }: Props = $props();

	let meta = $derived(categoryMeta(category));
</script>

{#snippet inner()}
	<span aria-hidden="true">{meta.emoji}</span>
	<span>{meta.label}</span>
{/snippet}

{#if href}
	<a
		{href}
		class="inline-flex items-center gap-1 rounded-full bg-brand-wash px-2 py-0.5 text-fluid-xs font-bold text-brand-ink transition-colors hover:bg-clover-500"
	>
		{@render inner()}
	</a>
{:else}
	<span
		class="inline-flex items-center gap-1 rounded-full bg-brand-wash px-2 py-0.5 text-fluid-xs font-bold text-brand-ink"
	>
		{@render inner()}
	</span>
{/if}
