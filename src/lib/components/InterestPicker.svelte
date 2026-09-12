<script lang="ts">
	import { INTERESTS } from '$lib/types';

	interface Props {
		/** Tags already chosen — checked on load. */
		selected?: string[];
		/** Form field name; repeats once per chosen tag. */
		name?: string;
	}

	let { selected = [], name = 'interests' }: Props = $props();

	/* Seeded once from the saved list; the user owns it from then on. */
	// svelte-ignore state_referenced_locally
	let chosen = $state(new Set(selected));

	function toggle(tag: string) {
		// Reassign so Svelte sees the change.
		const next = new Set(chosen);
		if (next.has(tag)) next.delete(tag);
		else next.add(tag);
		chosen = next;
	}
</script>

<div class="flex flex-wrap gap-1.5">
	{#each INTERESTS as tag (tag)}
		{@const on = chosen.has(tag)}
		<label
			class="cursor-pointer rounded-full border px-3 py-1 text-fluid-xs font-bold transition-colors {on
				? 'border-brand bg-brand-wash text-brand-ink'
				: 'border-hedge text-ink-soft hover:bg-surface-hover hover:text-ink'}"
		>
			<input
				type="checkbox"
				{name}
				value={tag}
				checked={on}
				onchange={() => toggle(tag)}
				class="sr-only"
			/>
			{tag}
		</label>
	{/each}
</div>
<p class="mt-2 text-fluid-xs text-ink-muted">
	{chosen.size} picked · optional, and you can change it later
</p>
